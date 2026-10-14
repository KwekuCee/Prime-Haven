import { supabase } from '@/integrations/supabase/client';

export interface RecalculateSalariesResult {
  updatedCount: number;
  totalGraphicSalary: number;
  totalUiuxSalary: number;
  totalWebSalary: number;
}

export const normalizeCategory = (title: string | null): string => {
  const t = (title || '').toLowerCase();
  if (t.includes('ui') || t.includes('ux') || t.includes('app')) return 'UI/UX Designer';
  if (t.includes('web') || t.includes('dev') || t.includes('frontend') || t.includes('fullstack') || t.includes('full-stack') || t.includes('backend')) return 'Web Developer';
  return 'Graphic Designer';
};

/**
 * Platform-wide salary recalculation engine.
 * Computes each designer's `salary_estimated` in `designer_details` using:
 * - Allocated revenue by category (`monthly_revenue_by_category`: graphic, uiux, web)
 * - Talent revenue share percentage (`revenue_share_percentage`, default 50%)
 * - Web developers get 60% of web revenue split by verified web submissions
 * - Graphic and UI/UX designers earn proportional to their current cycle points
 */
export const recalculateSalaries = async (): Promise<RecalculateSalariesResult> => {
  const nowIso = new Date().toISOString();

  // Load current revenue settings
  const { data: settingsData } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['monthly_revenue_by_category', 'revenue_share_percentage', 'monthly_revenue']);

  const settings: Record<string, any> = {};
  (settingsData || []).forEach((s: { key: string; value: any }) => { settings[s.key] = s.value; });

  let graphicAmt = 0;
  let uiuxAmt = 0;
  let webAmt = 0;
  const categoryRevenue = settings.monthly_revenue_by_category;
  if (categoryRevenue && (Number(categoryRevenue.graphic || 0) > 0 || Number(categoryRevenue.uiux || 0) > 0 || Number(categoryRevenue.web || 0) > 0)) {
    graphicAmt = Number(categoryRevenue.graphic || 0);
    uiuxAmt = Number(categoryRevenue.uiux || 0);
    webAmt = Number(categoryRevenue.web || 0);
  } else {
    // Fallback: total monthly_revenue as graphic pool
    graphicAmt = Number(settings.monthly_revenue?.amount || 0);
  }

  const revenueShare = Number(settings.revenue_share_percentage?.value) || 50;
  const shareRatio = revenueShare / 100;

  const { data: allDesigners } = await (supabase as any)
    .from('designer_details')
    .select('user_id, monthly_points, professional_title');

  // Approved submissions
  const { data: allSubmissions } = await (supabase as any)
    .from('submissions')
    .select('designer_id, service_type, points_awarded')
    .in('status', ['ph_approved', 'approved']);

  if (!allDesigners || allDesigners.length === 0) {
    return { updatedCount: 0, totalGraphicSalary: 0, totalUiuxSalary: 0, totalWebSalary: 0 };
  }

  const graphicTypes = ['logo', 'branding', 'print', 'flyer'];

  const webDevIds = new Set(
    (allDesigners as any[])
      .filter((d: any) => normalizeCategory(d.professional_title ?? null) === 'Web Developer')
      .map((d: any) => d.user_id)
  );

  const eligibleDesignerIds = new Set(
    (allDesigners as any[])
      .filter((d: any) => Number(d.monthly_points || 0) > 0 && !webDevIds.has(d.user_id))
      .map((d: any) => d.user_id)
  );

  const designerCategoryPoints: Record<string, { graphic: number; uiux: number }> = {};
  (allDesigners as any[]).forEach((d: any) => {
    if (!webDevIds.has(d.user_id)) {
      designerCategoryPoints[d.user_id] = { graphic: 0, uiux: 0 };
    }
  });

  const webDevSubmissions: Record<string, number> = {};
  let totalWebDevSubmissions = 0;

  ((allSubmissions || []) as any[]).forEach((s: any) => {
    if (s.service_type === 'web' && webDevIds.has(s.designer_id)) {
      webDevSubmissions[s.designer_id] = (webDevSubmissions[s.designer_id] || 0) + 1;
      totalWebDevSubmissions++;
      return;
    }

    if (!eligibleDesignerIds.has(s.designer_id)) return;
    const pts = Number(s.points_awarded || 0);
    if (pts <= 0) return;
    if (graphicTypes.includes(s.service_type || '')) designerCategoryPoints[s.designer_id].graphic += pts;
    else if (s.service_type === 'uiux') designerCategoryPoints[s.designer_id].uiux += pts;
  });

  // Effective points split
  const designersEffectivePoints: Record<string, { graphic: number; uiux: number }> = {};
  const effectiveTotals = { graphic: 0, uiux: 0 };

  (allDesigners as any[]).forEach((d: any) => {
    if (webDevIds.has(d.user_id)) return;

    const totalMonthlyPts = Number(d.monthly_points || 0);
    if (totalMonthlyPts <= 0) return;

    const subPts = designerCategoryPoints[d.user_id] || { graphic: 0, uiux: 0 };
    const subTotal = subPts.graphic + subPts.uiux;

    let effectiveG = 0;
    let effectiveU = 0;

    if (subTotal > 0) {
      effectiveG = (subPts.graphic / subTotal) * totalMonthlyPts;
      effectiveU = (subPts.uiux / subTotal) * totalMonthlyPts;
    } else {
      const cat = normalizeCategory(d.professional_title ?? null);
      if (cat === 'UI/UX Designer') effectiveU = totalMonthlyPts;
      else effectiveG = totalMonthlyPts;
    }

    designersEffectivePoints[d.user_id] = { graphic: effectiveG, uiux: effectiveU };
    effectiveTotals.graphic += effectiveG;
    effectiveTotals.uiux += effectiveU;
  });

  let totalGraphicSalary = 0;
  let totalUiuxSalary = 0;
  let totalWebSalary = 0;

  const updates = (allDesigners as any[]).map((designer: any) => {
    let safeSalary = 0;
    if (webDevIds.has(designer.user_id)) {
      const devSubs = webDevSubmissions[designer.user_id] || 0;
      const webSalary = totalWebDevSubmissions > 0 ? (devSubs / totalWebDevSubmissions) * (webAmt * 0.6) : 0;
      safeSalary = Number.isFinite(webSalary) && webSalary > 0 ? Number(webSalary.toFixed(2)) : 0;
      totalWebSalary += safeSalary;
    } else {
      const totalMonthlyPts = Number(designer.monthly_points || 0);
      if (totalMonthlyPts > 0) {
        const ep = designersEffectivePoints[designer.user_id] || { graphic: 0, uiux: 0 };
        const graphicSalary = effectiveTotals.graphic > 0 ? (ep.graphic / effectiveTotals.graphic) * (graphicAmt * shareRatio) : 0;
        const uiuxSalary = effectiveTotals.uiux > 0 ? (ep.uiux / effectiveTotals.uiux) * (uiuxAmt * shareRatio) : 0;
        const totalSalary = graphicSalary + uiuxSalary;
        safeSalary = Number.isFinite(totalSalary) && totalSalary > 0 ? Number(totalSalary.toFixed(2)) : 0;
        totalGraphicSalary += (effectiveTotals.graphic > 0 ? (ep.graphic / effectiveTotals.graphic) * (graphicAmt * shareRatio) : 0);
        totalUiuxSalary += (effectiveTotals.uiux > 0 ? (ep.uiux / effectiveTotals.uiux) * (uiuxAmt * shareRatio) : 0);
      }
    }

    return (supabase as any)
      .from('designer_details')
      .update({ salary_estimated: safeSalary, updated_at: nowIso })
      .eq('user_id', designer.user_id);
  });

  await Promise.all(updates);

  return {
    updatedCount: updates.length,
    totalGraphicSalary: Number(totalGraphicSalary.toFixed(2)),
    totalUiuxSalary: Number(totalUiuxSalary.toFixed(2)),
    totalWebSalary: Number(totalWebSalary.toFixed(2)),
  };
};
