import { supabase } from '@/integrations/supabase/client';
import { parseBudgetGhs, normalizeServiceSlug } from '@/lib/platformRevenue';

export interface RecalculateSalariesResult {
  updatedCount: number;
  totalGraphicSalary: number;
  totalUiuxSalary: number;
  totalWebSalary: number;
  totalAllSalaries: number;
}

export const normalizeCategory = (title: string | null): string => {
  const t = (title || '').toLowerCase();
  if (t.includes('ui') || t.includes('ux')) return 'UI/UX Designer';
  if (t.includes('web') || t.includes('dev') || t.includes('frontend') || t.includes('fullstack') || t.includes('backend')) return 'Web Developer';
  if (t.includes('mobile') || t.includes('app')) return 'Mobile App Developer';
  if (t.includes('motion') || t.includes('animat')) return 'Motion Graphics Designer';
  if (t.includes('video') || t.includes('edit')) return 'Video Editor';
  if (t.includes('social') || t.includes('smm')) return 'Social Media Manager';
  if (t.includes('it') || t.includes('support')) return 'IT Specialist';
  return 'Graphic Designer';
};

/**
 * Platform-wide salary recalculation engine.
 *
 * Implements the 70/30 profit split:
 * For every contract/project/order a talent completes and is approved
 * (QA review approved, PH approved, or client accepted), the talent receives
 * 70% of that contract's budget or project price credited to their salary!
 *
 * Prime Haven retains 30%.
 *
 * Also accounts for any general department pools in `monthly_revenue_by_category`
 * to ensure all verified submissions are equitably compensated.
 */
export const recalculateSalaries = async (): Promise<RecalculateSalariesResult> => {
  const nowIso = new Date().toISOString();

  // Load current revenue settings, contracts, claims, projects, orders, submissions, and designers
  const [settingsRes, designersRes, submissionsRes, contractsRes, claimsRes, projectsRes, ordersRes] = await Promise.all([
    supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['monthly_revenue_by_category', 'revenue_share_percentage', 'monthly_revenue']),
    (supabase as any).from('designer_details').select('user_id, monthly_points, total_points, professional_title'),
    (supabase as any)
      .from('submissions')
      .select('id, designer_id, project_name, service_type, client_ref, client_project_id, status, points_awarded, client_accepted, ph_approved, created_at'),
    (supabase as any).from('job_contracts').select('id, budget, title, category, status'),
    (supabase as any).from('job_contract_claims').select('id, contract_id, designer_id, status'),
    (supabase as any).from('client_projects').select('id, price_ghs, budget, title, category, accepted_designer_id, status'),
    (supabase as any).from('client_orders').select('id, price, service_type, assigned_designer_id, payment_status, project_status'),
  ]);

  const settings: Record<string, any> = {};
  (settingsRes.data || []).forEach((s: { key: string; value: any }) => { settings[s.key] = s.value; });

  const revenueSharePercent = Number(settings.revenue_share_percentage?.value) || 70; // 70% talent share rule
  const shareRatio = revenueSharePercent / 100;

  const allDesigners = (designersRes?.data || []) as any[];
  if (!allDesigners || allDesigners.length === 0) {
    return { updatedCount: 0, totalGraphicSalary: 0, totalUiuxSalary: 0, totalWebSalary: 0, totalAllSalaries: 0 };
  }

  const allSubmissions = (submissionsRes?.data || []) as any[];
  const contractsMap = new Map(((contractsRes?.data || []) as any[]).map((c: any) => [c.id, c]));
  const projectsMap = new Map(((projectsRes?.data || []) as any[]).map((p: any) => [p.id, p]));
  const ordersMap = new Map(((ordersRes?.data || []) as any[]).map((o: any) => [o.id, o]));
  const claims = (claimsRes?.data || []) as any[];

  // Map contract claims by designer
  const claimsByDesigner: Record<string, any[]> = {};
  claims.forEach((claim) => {
    if (!claimsByDesigner[claim.designer_id]) claimsByDesigner[claim.designer_id] = [];
    claimsByDesigner[claim.designer_id].push(claim);
  });

  // Calculate 70% contract earnings per designer
  const contractEarningsByDesigner: Record<string, number> = {};
  const creditedProjectsByDesigner: Record<string, Set<string>> = {};
  const earningsToSync: any[] = [];

  allDesigners.forEach((designer) => {
    contractEarningsByDesigner[designer.user_id] = 0;
    creditedProjectsByDesigner[designer.user_id] = new Set<string>();
  });

  allSubmissions.forEach((sub) => {
    const designerId = sub.designer_id;
    if (!designerId) return;

    const isApproved =
      sub.client_accepted === true ||
      sub.ph_approved === true ||
      ['ph_approved', 'approved', 'completed', 'client_approved', 'client_accepted'].includes(String(sub.status || '').toLowerCase());
    if (!isApproved) return;

    let matchedBudget = 0;
    let matchedProjectId: string | null = null;

    // 1. Check client_project_id
    if (sub.client_project_id) {
      if (contractsMap.has(sub.client_project_id)) {
        const c = contractsMap.get(sub.client_project_id);
        matchedBudget = parseBudgetGhs(c.budget);
        matchedProjectId = c.id;
      } else if (projectsMap.has(sub.client_project_id)) {
        const p = projectsMap.get(sub.client_project_id);
        matchedBudget = Number(p.price_ghs) || parseBudgetGhs(p.budget);
        matchedProjectId = p.id;
      }
    }

    // 2. Check client_ref if not matched
    if (matchedBudget <= 0 && sub.client_ref) {
      if (contractsMap.has(sub.client_ref)) {
        const c = contractsMap.get(sub.client_ref);
        matchedBudget = parseBudgetGhs(c.budget);
        matchedProjectId = c.id;
      } else if (ordersMap.has(sub.client_ref)) {
        const o = ordersMap.get(sub.client_ref);
        matchedBudget = Number(o.price) || 0;
        matchedProjectId = o.id;
      } else if (projectsMap.has(sub.client_ref)) {
        const p = projectsMap.get(sub.client_ref);
        matchedBudget = Number(p.price_ghs) || parseBudgetGhs(p.budget);
        matchedProjectId = p.id;
      }
    }

    // 3. Check designer claims if still not matched
    if (matchedBudget <= 0 && claimsByDesigner[designerId]) {
      const matchedClaim = claimsByDesigner[designerId].find((cl) => {
        const c = contractsMap.get(cl.contract_id);
        if (!c) return false;
        // Match title or category
        return (
          c.title?.toLowerCase() === sub.project_name?.toLowerCase() ||
          sub.project_name?.toLowerCase().includes(c.title?.toLowerCase())
        );
      });
      if (matchedClaim) {
        const c = contractsMap.get(matchedClaim.contract_id);
        if (c) {
          matchedBudget = parseBudgetGhs(c.budget);
          matchedProjectId = c.id;
        }
      }
    }

    // If a contract/project budget was matched, credit 70% to talent
    if (matchedBudget > 0) {
      if (matchedProjectId && creditedProjectsByDesigner[designerId]) {
        creditedProjectsByDesigner[designerId].add(matchedProjectId);
      }
      const talentEarned = Math.round(matchedBudget * shareRatio * 100) / 100;
      contractEarningsByDesigner[designerId] = (contractEarningsByDesigner[designerId] || 0) + talentEarned;

      earningsToSync.push({
        designer_id: designerId,
        submission_id: sub.id,
        project_id: matchedProjectId,
        job_price: matchedBudget,
        share_percent: revenueSharePercent,
        amount: talentEarned,
        currency: 'GHS',
        status: 'available',
        updated_at: nowIso,
      });
    }
  });

  // 4. Also credit any completed job contracts directly to claiming talents even if no formal submission was filed
  contractsMap.forEach((c: any) => {
    if (c.status !== 'completed') return;
    const contractBudget = parseBudgetGhs(c.budget);
    if (contractBudget <= 0) return;

    const claimingTalents = new Set<string>();
    if (Array.isArray(c.active_designer_ids)) {
      c.active_designer_ids.forEach((id: string) => { if (id) claimingTalents.add(id); });
    }
    claims.forEach((cl: any) => {
      if (cl.contract_id === c.id && cl.designer_id) {
        claimingTalents.add(cl.designer_id);
      }
    });

    claimingTalents.forEach((designerId) => {
      if (!creditedProjectsByDesigner[designerId]) {
        creditedProjectsByDesigner[designerId] = new Set<string>();
      }
      if (creditedProjectsByDesigner[designerId].has(c.id)) {
        return; // Already credited through submission
      }
      creditedProjectsByDesigner[designerId].add(c.id);

      const talentEarned = Math.round(contractBudget * shareRatio * 100) / 100;
      contractEarningsByDesigner[designerId] = (contractEarningsByDesigner[designerId] || 0) + talentEarned;

      earningsToSync.push({
        designer_id: designerId,
        submission_id: null,
        project_id: c.id,
        job_price: contractBudget,
        share_percent: revenueSharePercent,
        amount: talentEarned,
        currency: 'GHS',
        status: 'available',
        updated_at: nowIso,
      });
    });
  });

  // 5. Credit any completed client projects to accepted designer if not already credited
  projectsMap.forEach((p: any) => {
    if (p.status !== 'completed' || !p.accepted_designer_id) return;
    const projBudget = Number(p.price_ghs) || parseBudgetGhs(p.budget);
    if (projBudget <= 0) return;
    const designerId = p.accepted_designer_id;
    if (!creditedProjectsByDesigner[designerId]) {
      creditedProjectsByDesigner[designerId] = new Set<string>();
    }
    if (creditedProjectsByDesigner[designerId].has(p.id)) return;
    creditedProjectsByDesigner[designerId].add(p.id);

    const talentEarned = Math.round(projBudget * shareRatio * 100) / 100;
    contractEarningsByDesigner[designerId] = (contractEarningsByDesigner[designerId] || 0) + talentEarned;

    earningsToSync.push({
      designer_id: designerId,
      submission_id: null,
      project_id: p.id,
      job_price: projBudget,
      share_percent: revenueSharePercent,
      amount: talentEarned,
      currency: 'GHS',
      status: 'available',
      updated_at: nowIso,
    });
  });

  // Calculate points-based category pool shares for any additional unallocated monthly pools
  const categoryRevenue = settings.monthly_revenue_by_category || {};
  let manualGraphic = Number(categoryRevenue.graphic ?? categoryRevenue['graphic-design']) || 0;
  let manualUiux = Number(categoryRevenue.uiux ?? categoryRevenue['ui-ux-design']) || 0;
  let manualWeb = Number(categoryRevenue.web ?? categoryRevenue['web-development']) || 0;

  let totalGraphicSalary = 0;
  let totalUiuxSalary = 0;
  let totalWebSalary = 0;
  let totalAllSalaries = 0;

  const updates = allDesigners.map((designer: any) => {
    const contractEarned = contractEarningsByDesigner[designer.user_id] || 0;
    const monthlyPts = Number(designer.monthly_points || 0);

    // If talent earned contract money, that's their direct 70% share.
    // If they have monthly points and there's a manual pool configured, add points-based share.
    let poolShare = 0;
    const cat = normalizeCategory(designer.professional_title ?? null);
    if (monthlyPts > 0) {
      if (cat === 'Graphic Designer' && manualGraphic > 0) {
        poolShare = (monthlyPts / 100) * 10;
      } else if (cat === 'UI/UX Designer' && manualUiux > 0) {
        poolShare = (monthlyPts / 100) * 10;
      } else if (cat === 'Web Developer' && manualWeb > 0) {
        poolShare = (monthlyPts / 100) * 12;
      }
    }

    const finalSalary = Math.max(contractEarned, contractEarned + poolShare);
    const safeSalary = Number.isFinite(finalSalary) && finalSalary > 0 ? Number(finalSalary.toFixed(2)) : 0;

    totalAllSalaries += safeSalary;
    if (cat === 'Graphic Designer') totalGraphicSalary += safeSalary;
    else if (cat === 'UI/UX Designer') totalUiuxSalary += safeSalary;
    else if (cat === 'Web Developer') totalWebSalary += safeSalary;

    return (supabase as any)
      .from('designer_details')
      .update({ salary_estimated: safeSalary, updated_at: nowIso })
      .eq('user_id', designer.user_id);
  });

  await Promise.all(updates);

  // Sync with job_earnings table if earnings were computed
  if (earningsToSync.length > 0) {
    try {
      for (const earning of earningsToSync) {
        // Upsert by checking existing earning for this submission_id or project_id & designer_id
        let existingQuery = (supabase as any).from('job_earnings').select('id');
        if (earning.submission_id) {
          existingQuery = existingQuery.eq('submission_id', earning.submission_id);
        } else if (earning.project_id && earning.designer_id) {
          existingQuery = existingQuery.eq('project_id', earning.project_id).eq('designer_id', earning.designer_id);
        } else {
          continue;
        }
        const { data: existing } = await existingQuery.maybeSingle();

        if (existing?.id) {
          await (supabase as any)
            .from('job_earnings')
            .update({
              amount: earning.amount,
              status: earning.status,
              job_price: earning.job_price,
              share_percent: earning.share_percent,
              updated_at: nowIso,
            })
            .eq('id', existing.id);
        } else {
          await (supabase as any).from('job_earnings').insert({
            designer_id: earning.designer_id,
            submission_id: earning.submission_id,
            project_id: earning.project_id,
            job_price: earning.job_price,
            share_percent: earning.share_percent,
            amount: earning.amount,
            currency: 'GHS',
            status: 'available',
            created_at: nowIso,
            updated_at: nowIso,
          });
        }
      }
    } catch (syncErr) {
      console.warn('Could not sync job_earnings table:', syncErr);
    }
  }

  return {
    updatedCount: updates.length,
    totalGraphicSalary: Number(totalGraphicSalary.toFixed(2)),
    totalUiuxSalary: Number(totalUiuxSalary.toFixed(2)),
    totalWebSalary: Number(totalWebSalary.toFixed(2)),
    totalAllSalaries: Number(totalAllSalaries.toFixed(2)),
  };
};
