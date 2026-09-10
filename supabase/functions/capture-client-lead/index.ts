// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.clientEmail || "").trim().toLowerCase();
    const name = String(body.clientName || "").trim().slice(0, 200);
    const whatsapp = body.clientWhatsapp ? String(body.clientWhatsapp).trim().slice(0, 40) : null;
    const company = body.businessName ? String(body.businessName).trim().slice(0, 200) : null;
    const password = body.clientPassword ? String(body.clientPassword) : "";

    if (!EMAIL_RE.test(email) || email.length > 255) {
      return json({ success: false, error: "invalid_email", message: "A valid email is required." }, 400);
    }
    if (!name) {
      return json({ success: false, error: "invalid_name", message: "A name is required." }, 400);
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 1. Find or create the client's account (tagged as a client) ──────────
    let userId: string | null = null;
    try {
      // @ts-ignore filter is supported by the admin API
      const { data: listData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1, filter: `email.eq.${email}` });
      const found = listData?.users?.find?.((u: any) => (u.email || "").toLowerCase() === email);
      if (found) userId = found.id;
    } catch (lookupErr) {
      console.warn("User lookup failed, continuing:", lookupErr);
    }

    if (!userId) {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: password.length >= 6 ? password : undefined,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          business_name: company,
          whatsapp,
          account_type: "client",
          role: "client",
        },
      });
      if (createErr && createErr.status !== 422) {
        console.error("Account creation error:", createErr);
      }
      userId = created?.user?.id || null;
    } else {
      try {
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            account_type: "client",
            role: "client",
            full_name: name,
            business_name: company,
            whatsapp,
          },
        });
      } catch (updateErr) {
        console.warn("Metadata update failed (non-critical):", updateErr);
      }
    }

    // Client role only — strip any accidental professional role/profile row.
    if (userId) {
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["superadmin", "masteradmin"]);

      if (!adminRoles || adminRoles.length === 0) {
        await supabase.from("user_roles").upsert(
          { user_id: userId, role: "client" },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
        await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "designer");
        await supabase.from("designer_details").delete().eq("user_id", userId);
      }
    }

    // ── 2. Upsert the central client record (visible in the admin client list) ──
    const { data: clientRow, error: clientErr } = await supabase
      .from("clients")
      .upsert(
        { email, name, company, whatsapp },
        { onConflict: "email" },
      )
      .select("id")
      .maybeSingle();

    if (clientErr) {
      console.error("Client record upsert failed:", clientErr);
      return json({ success: false, error: "client_record_failed", message: "Could not save your details. Please try again." }, 500);
    }

    return json({ success: true, clientId: clientRow?.id || null, userId });
  } catch (err) {
    console.error("capture-client-lead error:", err);
    return json({ success: false, error: "unexpected_error", message: "Unexpected error while saving your details." }, 500);
  }
});
