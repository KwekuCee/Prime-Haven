import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  event: string; // e.g. login_success, login_failed, password_reset_requested, password_changed, signup
  email?: string;
  user_id?: string;
  description?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.event || typeof body.event !== "string") {
      return new Response(JSON.stringify({ error: "event required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || "";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let userId: string | null = body.user_id || null;
    if (!userId && body.email) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", body.email)
        .maybeSingle();
      if (data?.id) userId = data.id;
    }

    const description =
      body.description ||
      (body.email
        ? `${body.event} for ${body.email}`
        : body.event);

    const insertPayload: Record<string, unknown> = {
      action_type: body.event,
      admin_id: userId,
      description,
      timestamp: new Date().toISOString(),
      new_value: { user_agent: userAgent, email: body.email || null },
    };
    if (ip) insertPayload.ip_address = ip;

    const { error } = await supabase.from("system_logs").insert(insertPayload);
    if (error) {
      console.error("log-auth-event insert error", error);
      return new Response(JSON.stringify({ error: "log_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("log-auth-event error", e);
    return new Response(JSON.stringify({ error: "bad_request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
