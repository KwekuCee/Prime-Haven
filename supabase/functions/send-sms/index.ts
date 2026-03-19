import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SmsRequest {
  to: string;
  body: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");

    const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");
    if (!TWILIO_FROM_NUMBER) throw new Error("TWILIO_FROM_NUMBER is not configured");

    const { to, body }: SmsRequest = await req.json();

    if (!to || !body) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing 'to' or 'body'" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Normalize phone number to E.164
    let phone = to.replace(/[\s\-()]/g, "");
    if (!phone.startsWith("+")) {
      phone = `+${phone}`;
    }

    const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        From: TWILIO_FROM_NUMBER,
        Body: body,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Twilio API error:", response.status, JSON.stringify(data));
      return new Response(
        JSON.stringify({ success: false, error: `Twilio error [${response.status}]`, details: data }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`SMS sent to ${phone}, SID: ${data.sid}`);
    return new Response(
      JSON.stringify({ success: true, sid: data.sid }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("send-sms error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
