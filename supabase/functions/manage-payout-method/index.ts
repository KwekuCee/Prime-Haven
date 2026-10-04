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
      const { data, error } = await admin.rpc("manage_talent_payout_method_service", {
        p_user_id: auth.user.id, p_action: "create", p_method_id: null,
        p_provider: provider, p_phone_number: phone, p_account_name: accountName,
      });
      if (error) throw error;
      return json(data);
    }
    if (action === "delete") {
      const methodId = String(body.method_id || "");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(methodId)) return json({ error: "Invalid payout method." }, 400);
      const { data, error } = await admin.rpc("manage_talent_payout_method_service", {
        p_user_id: auth.user.id, p_action: "delete", p_method_id: methodId,
        p_provider: null, p_phone_number: null, p_account_name: null,
      });
      if (error) return json({ error: error.message }, error.message.includes("active withdrawal") ? 409 : 400);
      return json(data);
    }
    return json({ error: "Unsupported action." }, 400);
  } catch (error) {
    console.error("manage-payout-method error", error);
    return json({ error: "Could not update the payout method." }, 500);
  }
}));
