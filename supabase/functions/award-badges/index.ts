import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const user_id = body.user_id as string | undefined;
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Load badges
    const { data: badges } = await supabase.from('badges').select('id, key, criteria');
    if (!badges) {
      return new Response(JSON.stringify({ ok: true, awarded: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Gather user metrics
    const [{ data: approvedCountData }] = await Promise.all([supabase
      .from('submissions')
      .select('id', { count: 'exact' })
      .eq('designer_id', user_id)
      .eq('ph_approved', true)]);

    const approved_count = (approvedCountData && Array.isArray(approvedCountData)) ? approvedCountData.length : 0;

    const { data: designer } = await supabase.from('designer_details').select('total_points, talent_score').eq('user_id', user_id).maybeSingle();
    const total_points = designer?.total_points || 0;
    const talent_score = designer?.talent_score || 0;

    let awarded = 0;

    for (const b of badges) {
      const criteria = b.criteria || {};
      if (criteria.type === 'threshold') {
        const metric = criteria.metric;
        const value = Number(criteria.value || 0);
        let meets = false;
        if (metric === 'approved_count') meets = approved_count >= value;
        if (metric === 'total_points') meets = total_points >= value;
        if (metric === 'talent_score') meets = talent_score >= value;

        if (meets) {
          // Insert if not exists
          await supabase
            .from('user_badges')
            .insert({ user_id, badge_id: b.id, source: 'auto-check', meta: { approved_count, total_points, talent_score } })
            .then(() => { awarded += 1; })
            .catch(() => {});
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, awarded }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('award-badges error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
