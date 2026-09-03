import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "unauthorized", message: "Sign in required." }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes, error: authErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !userRes?.user) return json({ error: "unauthorized", message: "Session expired." }, 401);
    const actorId = userRes.user.id;

    const { data: actorRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", actorId)
      .maybeSingle();
    if (!actorRole || !["superadmin", "masteradmin"].includes(String(actorRole.role))) {
      return json({ error: "forbidden", message: "Only admins can delete accounts." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const targetId = String(body?.user_id || "");
    if (!UUID_RE.test(targetId)) return json({ error: "invalid_user_id", message: "A valid account id is required." }, 400);
    if (targetId === actorId) return json({ error: "self_delete", message: "You cannot delete your own account." }, 400);

    const { data: targetProfile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", targetId)
      .maybeSingle();

    const { data: targetRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", targetId)
      .maybeSingle();

    // Release anything the user is holding so work does not get stuck.
    await admin
      .from("client_projects")
      .update({ claimed_by: null, claimed_at: null, accepted_designer_id: null, status: "pending" })
      .eq("claimed_by", targetId);

    const cascades: Array<[string, string]> = [
      ["job_contract_claims", "designer_id"],
      ["project_assignments", "designer_id"],
      ["job_earnings", "designer_id"],
      ["submissions", "designer_id"],
      ["withdrawals", "user_id"],
      ["user_payout_methods", "user_id"],
      ["payments", "user_id"],
      ["user_badges", "user_id"],
      ["user_settings", "user_id"],
      ["notifications", "user_id"],
      ["designer_details", "user_id"],
      ["email_verification_tokens", "user_id"],
      ["portfolio_items", "designer_id"],
      ["affiliate_profiles", "user_id"],
      ["smm_platform_connections", "user_id"],
      ["user_roles", "user_id"],
    ];

    const failures: string[] = [];
    for (const [table, column] of cascades) {
      const { error } = await admin.from(table).delete().eq(column, targetId);
      if (error) failures.push(`${table}: ${error.message}`);
    }

    await admin.from("messages").delete().or(`sender_id.eq.${targetId},receiver_id.eq.${targetId}`);
    await admin.from("profiles").delete().eq("id", targetId);

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(targetId);
    if (authDeleteError) {
      return json(
        { error: "auth_delete_failed", message: authDeleteError.message, cleanup_warnings: failures },
        500,
      );
    }

    await admin.from("system_logs").insert({
      admin_id: actorId,
      action_type: "user_deleted",
      description: `Permanently deleted account ${targetProfile?.full_name || targetProfile?.email || targetId}`,
      old_value: {
        user_id: targetId,
        email: targetProfile?.email ?? null,
        role: targetRole?.role ?? null,
        cleanup_warnings: failures,
      },
      timestamp: new Date().toISOString(),
    });

    return json({ success: true, cleanup_warnings: failures });
  } catch (err) {
    console.error("delete-user failed:", err);
    return json({ error: "unexpected_error", message: (err as Error).message }, 500);
  }
});
