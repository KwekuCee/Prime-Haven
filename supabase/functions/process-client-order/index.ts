// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const KORAPAY_SECRET_KEY = Deno.env.get("KORAPAY_SECRET_KEY");
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DISCORD_CHANNELS: Record<string, string> = {
  "graphic-design": "1470244531680186478",
  "app-design": "1470244675951529984",
  "web-dev": "1470244738073497704",
};

// Approximate conversion rate
const USD_TO_GHS = 15.5;

function encodeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const PRIVATE_IP_RE = /^(127\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|0\.|::1$|fc00:|fe80:)/i;
const ALLOWED_CONTENT_TYPES = /^(image\/(png|jpe?g|gif|webp|svg\+xml)|application\/pdf)/i;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function isSafeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname;
    if (PRIVATE_IP_RE.test(host)) return false;
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
    return true;
  } catch {
    return false;
  }
}

async function downloadFile(url: string): Promise<{ data: Uint8Array; contentType: string; name: string } | null> {
  try {
    if (!isSafeUrl(url)) {
      console.warn("Rejected unsafe reference URL:", url);
      return null;
    }
    const res = await fetch(url, { redirect: "error" });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    if (!ALLOWED_CONTENT_TYPES.test(contentType)) {
      console.warn("Rejected disallowed content-type:", contentType);
      return null;
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_FILE_BYTES) {
      console.warn("Rejected oversized file:", buf.byteLength);
      return null;
    }
    const data = new Uint8Array(buf);
    const urlPath = new URL(url).pathname;
    const name = urlPath.split("/").pop() || "file";
    return { data, contentType, name };
  } catch (e) {
    console.error("Failed to download file:", url, e);
    return null;
  }
}

async function postToDiscord(channelId: string, embed: any, files?: { name: string; data: Uint8Array; contentType: string }[]): Promise<string | null> {
  try {
    let res: Response;

    if (files && files.length > 0) {
      const formData = new FormData();
      const attachments = files.map((f, i) => ({ id: i, filename: f.name }));
      const imageExts = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
      const firstImage = files.find(f => imageExts.some(ext => f.name.toLowerCase().endsWith(ext)));
      if (firstImage) {
        embed.image = { url: `attachment://${firstImage.name}` };
      }
      const payload = { embeds: [embed], attachments };
      formData.append("payload_json", JSON.stringify(payload));

      for (let i = 0; i < files.length; i++) {
        const blob = new Blob([files[i].data], { type: files[i].contentType });
        formData.append(`files[${i}]`, blob, files[i].name);
      }

      res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
        body: formData,
      });
    } else {
      res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ embeds: [embed] }),
      });
    }

    if (!res.ok) {
      console.error("Discord API error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.id || null;
  } catch (e) {
    console.error("Discord post error:", e);
    return null;
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      clientName, clientEmail, clientWhatsapp,
      serviceType, serviceLabel, tier, price,
      description, discordCategory, paymentReference, referenceFiles, gateway = 'korapay',
      clientPassword, businessName
    } = body as {
      clientName: string;
      clientEmail: string;
      clientWhatsapp?: string;
      serviceType: string;
      serviceLabel: string;
      tier: string;
      price: number;
      description?: string;
      discordCategory: string;
      paymentReference: string;
      referenceFiles?: string[];
      gateway?: string;
      clientPassword?: string;
      businessName?: string;
    };

    console.log("Received order request:", JSON.stringify({ clientName, clientEmail, serviceType, tier, price, paymentReference, gateway }));

    // PH-FREE-* references are no longer accepted as valid free orders.
    // Free orders must come from a server-verified 100% promo applied via verify-payment first.
    if (typeof paymentReference === 'string' && paymentReference.startsWith('PH-FREE-')) {
      return new Response(JSON.stringify({ success: false, error: "invalid_reference" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // For paid orders, all fields including price > 0
    const missingFields: string[] = [];
    if (!clientName) missingFields.push("clientName");
    if (!clientEmail) missingFields.push("clientEmail");
    if (!serviceType) missingFields.push("serviceType");
    if (!tier) missingFields.push("tier");
    if (!paymentReference) missingFields.push("paymentReference");
    if (price === undefined || price === null) missingFields.push("price");

    if (missingFields.length > 0) {
      console.error("Validation failed — missing fields:", missingFields);
      return new Response(JSON.stringify({ success: false, error: "missing_fields" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let verifiedAmount: number;
    let verifiedCurrency: string;

    if (gateway === "paystack") {
      console.log("Verifying with Paystack...");
      const paystackResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(paymentReference)}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
      );
      const paystackData = await paystackResponse.json();

      if (!paystackData?.status || paystackData?.data?.status !== "success") {
        return new Response(JSON.stringify({ success: false, error: "payment_verification_failed" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      // Paystack reports amounts in the smallest currency unit (pesewas / kobo)
      verifiedAmount = Number(paystackData.data.amount) / 100;
      verifiedCurrency = paystackData.data.currency;
    } else {
      console.log("Verifying with Korapay...");
      const korapayResponse = await fetch(
        `https://api.korapay.com/merchant/api/v1/charges/${encodeURIComponent(paymentReference)}`,
        { headers: { Authorization: `Bearer ${KORAPAY_SECRET_KEY}` } }
      );
      const korapayData = await korapayResponse.json();

      if (!korapayData.status || korapayData.data?.status !== "success") {
        return new Response(JSON.stringify({ success: false, error: "payment_verification_failed" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      verifiedAmount = Number(korapayData.data.amount);
      verifiedCurrency = korapayData.data.currency;
    }


    const amountInGhs = verifiedCurrency === 'USD' ? verifiedAmount * USD_TO_GHS : verifiedAmount;

    if (verifiedCurrency !== "GHS" && verifiedCurrency !== "USD") {
      return new Response(JSON.stringify({ success: false, error: "Invalid payment currency", message: `Invalid currency: ${verifiedCurrency}` }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Creating Supabase client...");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check for duplicate payment reference
    const { data: existingOrder } = await supabase
      .from("client_orders")
      .select("id")
      .eq("payment_reference", paymentReference)
      .maybeSingle();

    if (existingOrder) {
      return new Response(JSON.stringify({ success: false, error: "Payment already processed", message: "This payment reference has already been used" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 1. Create client order
    console.log("Inserting client order...");
    const { data: order, error: orderError } = await supabase
      .from("client_orders")
      .insert({
        client_name: clientName,
        client_email: clientEmail,
        client_whatsapp: clientWhatsapp || null,
        service_type: serviceType,
        tier,
        price: amountInGhs,
        description: description || null,
        payment_status: "completed",
        payment_reference: paymentReference,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Failed to create order:", orderError);
      return new Response(JSON.stringify({ success: false, error: "order_creation_failed" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 1b. Create the client account.
    // The payment for this email has just been verified with the gateway, so we
    // provision the account with the password the client chose at checkout and let
    // them sign in immediately. The email itself is NOT treated as proven: the
    // profile stays `email_verified = false` and a verification link is sent, which
    // is what drives the "verify your email" banner inside the client portal.
    console.log("Setting up client account...");
    let clientUserId: string | null = null;
    try {
      let existingUser: { id: string } | null = null;
      try {
        // @ts-ignore - filter supported by supabase-js admin API
        const { data: listData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1, filter: `email.eq.${clientEmail}` });
        const found = listData?.users?.find?.((u: any) => (u.email || "").toLowerCase() === clientEmail.toLowerCase());
        if (found) existingUser = { id: found.id };
      } catch (lookupErr) {
        console.warn("User lookup failed, continuing:", lookupErr);
      }

      if (!existingUser) {
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email: clientEmail,
          password: clientPassword && String(clientPassword).length >= 8 ? String(clientPassword) : undefined,
          email_confirm: true,
          user_metadata: {
            full_name: clientName,
            business_name: businessName,
            whatsapp: clientWhatsapp,
            account_type: 'client',
            role: 'client',
          },
        });
        if (createErr && createErr.status !== 422) {
          console.error("Auth creation error:", createErr);
        }
        clientUserId = created?.user?.id || null;

        // Verification link so the inbox owner confirms ownership.
        try {
          await supabase.auth.admin.generateLink({ type: "magiclink", email: clientEmail });
        } catch (linkErr) {
          console.warn("Verification link generation failed (non-critical):", linkErr);
        }
      } else {
        // Never overwrite credentials on an existing account.
        clientUserId = existingUser.id;
        console.log("Client account already exists — leaving credentials untouched.");
      }

      // Make sure the account carries the client role (older accounts may miss it).
      if (clientUserId) {
        await supabase.from("user_roles").upsert(
          { user_id: clientUserId, role: 'client' },
          { onConflict: 'user_id,role', ignoreDuplicates: true },
        );
      }
    } catch (e) {
      console.error("Auth setup catch error (non-critical):", e);
    }

    // 1c. Upsert into clients table (central client database)
    let clientRecordId: string | null = null;
    const { data: clientRecord, error: clientRecordError } = await supabase
      .from("clients")
      .upsert({
        email: clientEmail,
        name: clientName,
        company: businessName || null,
        whatsapp: clientWhatsapp || null,
      }, { onConflict: 'email' })
      .select("id")
      .maybeSingle();

    if (clientRecordError) {
      console.error("Client record update error:", clientRecordError);
    } else {
      clientRecordId = clientRecord?.id || null;
    }

    // 2. Auto-create client project for tracking
    console.log("Creating client project...");
    const distributionMap: Record<string, { professions: string[], max: number }> = {
      "graphic-design": { professions: ['Graphic Designer'], max: 2 },
      "app-design": { professions: ['UI/UX Designer'], max: 1 },
      "web-dev": { professions: ['UI/UX Designer', 'Web Developer'], max: 1 },
    };
    const dist = distributionMap[discordCategory] || { professions: ['Web Developer'], max: 1 };

    const categoryMap: Record<string, string> = {
      "graphic-design": "graphic-design",
      "app-design": "ui-ux",
      "web-dev": "web-development",
    };

    const { error: projectError } = await supabase.from("client_projects").insert({
      title: `${serviceLabel || serviceType} (${tier.charAt(0).toUpperCase() + tier.slice(1)}) — ${clientName}`,
      client_name: clientName,
      client_email: clientEmail,
      client_whatsapp: clientWhatsapp || null,
      client_id: clientRecordId,
      created_by: clientUserId,
      description,
      category: categoryMap[discordCategory] || "web-development",
      status: "pending",
      budget: `GH₵${amountInGhs}`,
      // Payment is confirmed at this point — stamping price + paid_at is what
      // publishes the job to the designer marketplace.
      price_ghs: Number(amountInGhs) || 0,
      paid_at: new Date().toISOString(),
      required_professions: dist.professions,
      max_assignees: 1,
      reference_images: Array.isArray(referenceFiles) ? referenceFiles : [],
    });

    if (projectError) {
      console.error("Failed to create client project (non-critical):", projectError);
      // Don't fail the whole request for this
    }

    // 2b. Record the incoming payment in the finance ledger with the revenue split.
    try {
      const { data: shareSetting } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "revenue_share_percentage")
        .maybeSingle();
      const sharePercent = Number(shareSetting?.value ?? 70) || 70;
      const talentShare = Math.round((Number(amountInGhs) * sharePercent) / 100 * 100) / 100;
      const platformProfit = Math.round((Number(amountInGhs) - talentShare) * 100) / 100;

      if (clientUserId) {
        await supabase.from("payments").insert({
          user_id: clientUserId,
          amount: Number(amountInGhs) || 0,
          type: "client_order",
          status: "completed",
          transaction_id: paymentReference,
          payment_gateway: gateway === 'paystack' ? 'Paystack' : 'Korapay',
          payment_details: {
            order_id: order?.id,
            service_type: serviceType,
            tier,
            currency: verifiedCurrency,
            share_percent: sharePercent,
            talent_share: talentShare,
            platform_profit: platformProfit,
          },
        });
      }
    } catch (ledgerError: any) {
      console.error("Ledger record failed (non-critical):", ledgerError);
    }


    // 3. Add revenue to the respective service category
    console.log("Updating revenue...");
    try {
      const revenueCategoryKey = discordCategory === "graphic-design" ? "graphic"
        : discordCategory === "app-design" ? "uiux"
          : "web";

      const { data: revenueSetting } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "monthly_revenue_by_category")
        .single();

      const currentRevenue = revenueSetting?.value as Record<string, number> || { graphic: 0, uiux: 0, web: 0 };
      currentRevenue[revenueCategoryKey] = (Number(currentRevenue[revenueCategoryKey]) || 0) + amountInGhs;

      await supabase
        .from("system_settings")
        .upsert({
          key: "monthly_revenue_by_category",
          value: currentRevenue,
          description: "Monthly revenue breakdown by service category",
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });

      const { data: totalRevSetting } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "monthly_revenue")
        .single();

      const totalRev = totalRevSetting?.value as any || { amount: 0, currency: "GHS" };
      totalRev.amount = (Number(totalRev.amount) || 0) + amountInGhs;

      await supabase
        .from("system_settings")
        .upsert({
          key: "monthly_revenue",
          value: totalRev,
          description: "Total monthly revenue",
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });
    } catch (revError: any) {
      console.error("Revenue update failed (non-critical):", revError);
    }

    // 4. Post to Discord (non-critical)
    console.log("Posting to Discord...");
    let discordMessageId: string | null = null;
    const channelId = DISCORD_CHANNELS[discordCategory];

    try {
      if (channelId && DISCORD_BOT_TOKEN) {
        const displayAmount = verifiedCurrency === 'USD'
          ? `$${verifiedAmount.toLocaleString()} USD (≈ GH₵${amountInGhs.toLocaleString()})`
          : `GH₵${amountInGhs.toLocaleString()}`;

        const embed = {
          title: `🆕 New Client Order: ${encodeHtml(serviceLabel || serviceType)}`,
          description: description ? encodeHtml(description.slice(0, 2048)) : "No description provided",
          color: 0x22c55e,
          fields: [
            { name: "👤 Client", value: encodeHtml(clientName), inline: true },
            { name: "📧 Email", value: encodeHtml(clientEmail), inline: true },
            { name: "📦 Package", value: `${tier.charAt(0).toUpperCase() + tier.slice(1)}`, inline: true },
            { name: "💰 Amount Paid", value: displayAmount, inline: true },
            ...(clientWhatsapp ? [{ name: "📱 WhatsApp", value: encodeHtml(clientWhatsapp), inline: true }] : []),
          ],
          footer: { text: `Prime Haven • Client Order (Paid via Korapay)` },
          timestamp: new Date().toISOString(),
        };

        const downloadedFiles: { name: string; data: Uint8Array; contentType: string }[] = [];
        if (referenceFiles && referenceFiles.length > 0) {
          embed.fields.push({ name: "📎 Reference Files", value: `${referenceFiles.length} file(s) attached`, inline: false });
          const downloads = await Promise.all(referenceFiles.slice(0, 10).map((url: string) => downloadFile(url)));
          for (const file of downloads) {
            if (file) downloadedFiles.push(file);
          }
        }

        discordMessageId = await postToDiscord(channelId, embed, downloadedFiles.length > 0 ? downloadedFiles : undefined);

        if (discordMessageId && order) {
          await supabase
            .from("client_orders")
            .update({ discord_posted: true, discord_message_id: discordMessageId })
            .eq("id", order.id);
        }
      }
    } catch (discordError: any) {
      console.error("Discord posting failed (non-critical):", discordError);
    }

    // 5. Log the action
    console.log("Logging action...");
    try {
      await supabase.from("system_logs").insert({
        action_type: "client_order_created",
        description: `New client order: ${serviceLabel || serviceType} (${tier}) by ${clientName} — GH₵${amountInGhs} (${verifiedCurrency})`,
        new_value: { order_id: order?.id, service_type: serviceType, tier, price: amountInGhs, payment_reference: paymentReference, original_currency: verifiedCurrency },
      });
    } catch (logError: any) {
      console.error("System log insert failed (non-critical):", logError);
    }

    console.log("Order processed successfully:", order?.id);
    return new Response(JSON.stringify({ success: true, orderId: order?.id }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in process-client-order:", error);
    return new Response(JSON.stringify({ success: false, error: "server_error" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

});

