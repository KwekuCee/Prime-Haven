// Returns the publishable Paystack key so the browser can open inline checkout.
// Only the public key is exposed here; the secret key never leaves the server.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const publicKey = Deno.env.get('PAYSTACK_PUBLIC_KEY') || '';

  return new Response(
    JSON.stringify({ publicKey, configured: publicKey.length > 0 }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
