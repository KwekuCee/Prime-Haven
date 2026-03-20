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
    const token = Deno.env.get('ADSTERRA_API_TOKEN');
    if (!token) {
      throw new Error('ADSTERRA_API_TOKEN is not configured');
    }

    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint') || 'stats';
    const startDate = url.searchParams.get('start_date') || '';
    const finDate = url.searchParams.get('fin_date') || '';
    const groupBy = url.searchParams.get('group_by') || 'date';

    let apiUrl = '';

    switch (endpoint) {
      case 'stats': {
        const params = new URLSearchParams();
        if (startDate) params.set('start_date', startDate);
        if (finDate) params.set('fin_date', finDate);
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
