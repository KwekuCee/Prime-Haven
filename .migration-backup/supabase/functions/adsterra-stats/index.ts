import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADSTERRA_API_BASE = 'https://api3.adsterratools.com/publisher';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const isAdmin = (roleRow || []).some((r: any) => r.role === 'masteradmin' || r.role === 'superadmin');
    if (!isAdmin) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const token = Deno.env.get('ADSTERRA_API_TOKEN');
    if (!token) {
      throw new Error('ADSTERRA_API_TOKEN is not configured');
    }

    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint') || 'stats';
    const startDate = url.searchParams.get('start_date') || '';
    const finishDate = url.searchParams.get('finish_date') || '';
    const groupBy = url.searchParams.get('group_by') || 'date';

    let apiUrl = '';

    switch (endpoint) {
      case 'stats': {
        const params = new URLSearchParams();
        if (startDate) params.set('start_date', startDate);
        if (finishDate) params.set('finish_date', finishDate);
        if (groupBy) params.set('group_by', groupBy);
        apiUrl = `${ADSTERRA_API_BASE}/stats.json?${params.toString()}`;
        break;
      }
      case 'domains':
        apiUrl = `${ADSTERRA_API_BASE}/domains.json`;
        break;
      case 'placements': {
        const domainId = url.searchParams.get('domain_id') || '';
        apiUrl = domainId
          ? `${ADSTERRA_API_BASE}/domain/${domainId}/placements.json`
          : `${ADSTERRA_API_BASE}/placements.json`;
        break;
      }
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }

    const response = await fetch(apiUrl, {
      headers: { 'X-API-Key': token },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Adsterra API error [${response.status}]: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Adsterra stats error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
