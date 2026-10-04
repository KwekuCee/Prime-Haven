import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED_PROVIDERS = new Set(["mtn", "vodafone", "airteltigo"]);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Sign in required." }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user) return json({ error: "Your session has expired." }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    if (action === "create") {
      const provider = String(body.provider || "").trim().toLowerCase();
      const phone = String(body.phone_number || "").replace(/[^0-9+]/g, "");
      const accountName = String(body.account_name || "").trim();
      if (!ALLOWED_PROVIDERS.has(provider)) return json({ error: "Choose a supported Mobile Money provider." }, 400);
      if (!/^(\+233|0)\d{9}$/.test(phone)) return json({ error: "Enter a valid Ghana mobile number." }, 400);
      if (accountName.length < 2 || accountName.length > 100) return json({ error: "Enter the registered account name." }, 400);
      const { count } = await admin.from("user_payout_methods").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id);
      const availableAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { data: method, error } = await admin.from("user_payout_methods").insert({
        user_id: auth.user.id, provider, phone_number: phone, account_name: accountName,
        is_default: (count || 0) === 0, withdrawal_available_at: availableAt,
      }).select("id").single();
      if (error || !method) throw error || new Error("Could not save payout method");
      const metadata = { provider, phone_last4: phone.slice(-4) };
      await Promise.all([
        admin.from("talent_activity_logs").insert({ user_id: auth.user.id, action_type: "payout_method_added", entity_type: "payout_method", entity_id: method.id, summary: "Added a payout destination", metadata }),
        admin.from("system_logs").insert({ admin_id: auth.user.id, action_type: "talent_payout_method_added", description: "Talent added a payout destination", new_value: { method_id: method.id, ...metadata } }),
      ]);
      return json({ success: true, id: method.id, available_at: availableAt });
    }
    if (action === "delete") {
      const methodId = String(body.method_id || "");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(methodId)) return json({ error: "Invalid payout method." }, 400);
      const { data: method } = await admin.from("user_payout_methods").select("id, provider, phone_number").eq("id", methodId).eq("user_id", auth.user.id).maybeSingle();
      if (!method) return json({ error: "Payout method not found." }, 404);
      const { count: active } = await admin.from("withdrawals").select("id", { count: "exact", head: true }).eq("payout_method_id", methodId).in("status", ["pending", "processing"]);
      if ((active || 0) > 0) return json({ error: "This payout method has an active withdrawal." }, 409);
      const { error } = await admin.from("user_payout_methods").delete().eq("id", methodId).eq("user_id", auth.user.id);
      if (error) throw error;
      const metadata = { provider: method.provider, phone_last4: method.phone_number.slice(-4) };
      await Promise.all([
        admin.from("talent_activity_logs").insert({ user_id: auth.user.id, action_type: "payout_method_removed", entity_type: "payout_method", entity_id: methodId, summary: "Removed a payout destination", metadata }),
        admin.from("system_logs").insert({ admin_id: auth.user.id, action_type: "talent_payout_method_removed", description: "Talent removed a payout destination", old_value: { method_id: methodId, ...metadata } }),
      ]);
      return json({ success: true });
    }
    return json({ error: "Unsupported action." }, 400);
  } catch (error) {
    console.error("manage-payout-method error", error);
    return json({ error: "Could not update the payout method." }, 500);
  }
}));
