import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  event: string;
  email?: string;
  user_id?: string;
  description?: string;
}

const ALLOWED_EVENTS = new Set([
  "login_success",
  "login_failed",
  "login_blocked_unverified",
  "logout",
  "signup",
  "password_reset_requested",
  "password_changed",
  "admin_login_success",
  "admin_login_failed",
]);

// Events that legitimately happen before a session exists. For these, we do
// NOT require an Authorization header and we only use client-supplied email
// (never client-supplied user_id) for reference lookup — the log row's
// admin_id stays NULL to prevent audit-trail forgery.
const PRE_AUTH_EVENTS = new Set([
  "login_failed",
  "login_blocked_unverified",
  "password_reset_requested",
  "signup",
  "admin_login_failed",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.event || typeof body.event !== "string" || !ALLOWED_EVENTS.has(body.event)) {
      return new Response(JSON.stringify({ error: "invalid_event" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let authedUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabase.auth.getUser(token);
      if (data?.user?.id) authedUserId = data.user.id;
    }

    const isPreAuth = PRE_AUTH_EVENTS.has(body.event);

    // Post-auth events (login_success, admin_login_success, logout, password_changed)
    // MUST come from a real session. Refuse anything without a verified token so
    // attackers can't forge audit rows attributed to arbitrary users.
    if (!isPreAuth && !authedUserId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || "";

    // NEVER trust body.user_id. Post-auth events use the verified session id;
    // pre-auth events leave admin_id NULL (email is kept in new_value for reference).
    const userId: string | null = isPreAuth ? null : authedUserId;

    const description =
      body.description ||
      (body.email ? `${body.event} for ${body.email}` : body.event);

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
