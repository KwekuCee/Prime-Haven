import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { month, year } = await req.json();
    
    if (!month || !year) {
      return new Response(JSON.stringify({ error: 'month and year required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch all data for the month
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const [profilesRes, designersRes, submissionsRes, paymentsRes] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name'),
      supabase.from('designer_details').select('*'),
      supabase.from('submissions').select('*').gte('created_at', startDate).lte('created_at', endDate),
      supabase.from('payments').select('*').gte('created_at', startDate).lte('created_at', endDate),
    ]);

    const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));

    const designers = (designersRes.data || []).map((d: any) => {
      const profile = profilesMap.get(d.user_id);
      return {
        user_id: d.user_id,
        full_name: profile?.full_name || '',
        email: profile?.email || '',
        total_points: d.total_points || 0,
        monthly_points: d.monthly_points || 0,
        salary_estimated: d.salary_estimated || 0,
        professional_title: d.professional_title || '',
      };
    });

    const submissions = (submissionsRes.data || []).map((s: any) => {
      const profile = profilesMap.get(s.designer_id);
      return {
        ...s,
        designer_name: profile?.full_name || 'Unknown',
      };
    });

    const payments = (paymentsRes.data || []).map((p: any) => {
      const profile = profilesMap.get(p.user_id);
      return {
        ...p,
        user_name: profile?.full_name || 'Unknown',
      };
    });

    const recordData = { designers, submissions, payments };

    // Upsert the monthly record
    await supabase.from('monthly_records').upsert({
      month,
      year,
      record_data: recordData,
      created_at: new Date().toISOString(),
    }, { onConflict: 'month,year' });

    return new Response(JSON.stringify({ success: true, record_data: recordData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
