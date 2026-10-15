import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KORAPAY_SECRET_KEY = Deno.env.get("KORAPAY_SECRET_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const OPERATOR_MAP: Record<string, string> = {
  mtn: "MTN",
  vodafone: "VODAFONE",
  telecel: "VODAFONE",
  airteltigo: "AIRTELTIGO",
  at: "AIRTELTIGO",
};

function formatMoMoPhone(raw: string): string {
  const cleaned = raw.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("233") && cleaned.length === 12) {
    return "0" + cleaned.slice(3);
  }
  return cleaned;
}

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "unauthorized", message: "Sign in required." }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes, error: authErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !userRes?.user) {
      return json({ error: "unauthorized", message: "Session expired." }, 401);
    }
    const adminUserId = userRes.user.id;

    // Superadmin or masteradmin verification
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUserId)
      .in("role", ["superadmin", "masteradmin"])
      .limit(1);
    if (!roleData?.length) {
      return json({ error: "forbidden", message: "Only superadmins can trigger debt collection." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const debtId = String(body?.debt_id || "").trim();
    const channel = body?.channel === "checkout_link" ? "checkout_link" : "ussd_push";
    let phoneNumber = String(body?.phone_number || "").trim();
    let operator = String(body?.operator || "mtn").toLowerCase().trim();

    if (!debtId) {
      return json({ error: "missing_debt_id", message: "Debt ID is required." }, 400);
    }

    // 1. Fetch debt record
    const { data: debt, error: debtErr } = await admin
      .from("client_debts")
      .select("*")
      .eq("id", debtId)
      .maybeSingle();

    if (debtErr || !debt) {
      return json({ error: "debt_not_found", message: "Could not locate debt record." }, 404);
    }

    if (debt.status === "paid") {
      return json({ error: "already_paid", message: "This debt is already paid." }, 400);
    }

    // 2. Resolve client phone & operator if missing
    if (!phoneNumber) {
      if (debt.client_phone) {
        phoneNumber = debt.client_phone;
      } else if (debt.client_id) {
        const { data: client } = await admin
          .from("clients")
          .select("whatsapp")
          .eq("id", debt.client_id)
          .maybeSingle();
        if (client?.whatsapp) {
          phoneNumber = client.whatsapp;
        }
      }
    }

    if (!phoneNumber && channel === "ussd_push") {
      return json({
        error: "missing_phone",
        message: "A mobile money phone number is required to send USSD prompt.",
      }, 400);
    }

    const formattedPhone = formatMoMoPhone(phoneNumber);
    const resolvedOperator = OPERATOR_MAP[operator] || operator.toUpperCase();
    const amount = Number(debt.amount_owed);

    if (!amount || amount <= 0) {
      return json({ error: "invalid_amount", message: "Amount owed must be greater than zero." }, 400);
    }

    if (!KORAPAY_SECRET_KEY) {
      return json({ error: "korapay_not_configured", message: "Korapay secret key is not configured on the server." }, 500);
    }

    // 3. Generate unique transaction reference
    const reference = `ph_debt_${debt.id.replace(/-/g, "").slice(0, 8)}_${Date.now()}`;

    // 4. USSD Mobile Money Push Prompt
    if (channel === "ussd_push") {
      const payload = {
        reference,
        amount,
        currency: "GHS",
        customer: {
          name: debt.client_name || "Client",
          email: "billing@primehaven.tech",
        },
        mobile_money: {
          phone: formattedPhone,
          operator: resolvedOperator,
        },
        description: `Prime Haven settlement for ${debt.project_name || "Project"}`,
      };

      console.log(`Sending Korapay MoMo prompt to ${formattedPhone} (${resolvedOperator}) for GH₵${amount}`);

      const resp = await fetch("https://api.korapay.com/merchant/api/v1/charges/mobile-money", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KORAPAY_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const resBody = await resp.json().catch(() => ({}));
      console.log("Korapay charge response:", JSON.stringify(resBody));

      if (!resp.ok || resBody?.status === false) {
        const msg = resBody?.message || `Korapay returned HTTP ${resp.status}`;
        return json({
          error: "korapay_charge_failed",
          message: `Could not trigger MoMo prompt: ${msg}`,
          details: resBody,
        }, 502);
      }

      // Update debt status
      await admin
        .from("client_debts")
        .update({
          korapay_reference: reference,
          status: "processing",
          client_phone: formattedPhone,
          network_provider: operator,
          updated_at: new Date().toISOString(),
        })
        .eq("id", debt.id);

      await admin.from("system_logs").insert({
        admin_id: adminUserId,
        action_type: "client_debt_momo_prompt_sent",
        description: `Sent MoMo prompt of GH₵${amount.toFixed(2)} to ${formattedPhone} for debt: ${debt.client_name}`,
        new_value: { debt_id: debt.id, reference, phone: formattedPhone, operator: resolvedOperator, amount },
      });

      return json({
        success: true,
        reference,
        channel: "ussd_push",
        message: "USSD prompt pushed to client's phone. Awaiting MoMo PIN authorization.",
      });
    }

    // 5. Hosted Checkout Link Fallback
    const initPayload = {
      reference,
      amount,
      currency: "GHS",
      customer: {
        name: debt.client_name || "Client",
        email: "billing@primehaven.tech",
      },
      description: `Prime Haven settlement for ${debt.project_name || "Project"}`,
      redirect_url: "https://primehaven.tech/payment-success",
      channels: ["mobile_money", "card"],
      default_channel: "mobile_money",
    };

    const resp = await fetch("https://api.korapay.com/merchant/api/v1/charges/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KORAPAY_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(initPayload),
    });

    const resBody = await resp.json().catch(() => ({}));
    if (!resp.ok || resBody?.status === false) {
      const msg = resBody?.message || `Korapay returned HTTP ${resp.status}`;
      return json({
        error: "korapay_init_failed",
        message: `Could not create payment link: ${msg}`,
        details: resBody,
      }, 502);
    }

    const checkoutUrl = resBody?.data?.checkout_url;

    await admin
      .from("client_debts")
      .update({
        korapay_reference: reference,
        status: "processing",
        client_phone: formattedPhone || debt.client_phone,
        network_provider: operator,
        updated_at: new Date().toISOString(),
      })
      .eq("id", debt.id);

    await admin.from("system_logs").insert({
      admin_id: adminUserId,
      action_type: "client_debt_checkout_link_created",
      description: `Created checkout link of GH₵${amount.toFixed(2)} for debt: ${debt.client_name}`,
      new_value: { debt_id: debt.id, reference, checkout_url: checkoutUrl, amount },
    });

    return json({
      success: true,
      reference,
      checkout_url: checkoutUrl,
      channel: "checkout_link",
      message: "Payment link generated successfully.",
    });

  } catch (e) {
    console.error("collect-debt-payment error:", e);
    return json({ error: "server_error", message: (e as Error).message || "Internal server error" }, 500);
  }
}));
