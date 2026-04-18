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

async function downloadFile(url: string): Promise<{ data: Uint8Array; contentType: string; name: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = new Uint8Array(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "application/octet-stream";
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
      description, discordCategory, paymentReference, referenceFiles, gateway = 'korapay'
    } = body;

    console.log("Received order request:", JSON.stringify({ clientName, clientEmail, serviceType, tier, price, paymentReference, gateway }));

    // Detect free order early — before strict validation
    const isFreeOrder = typeof paymentReference === 'string' && paymentReference.startsWith('PH-FREE-');

    // For free orders, only require basic fields (price can be 0)
    // For paid orders, all fields including price > 0
    const missingFields: string[] = [];
    if (!clientName) missingFields.push("clientName");
    if (!clientEmail) missingFields.push("clientEmail");
    if (!serviceType) missingFields.push("serviceType");
    if (!tier) missingFields.push("tier");
    if (!paymentReference) missingFields.push("paymentReference");
    // Only check price for non-free orders
    if (!isFreeOrder && (price === undefined || price === null)) missingFields.push("price");

    if (missingFields.length > 0) {
      console.error("Validation failed — missing fields:", missingFields, "Body:", JSON.stringify(body));
      return new Response(JSON.stringify({ success: false, error: "Missing required fields", message: `Missing: ${missingFields.join(", ")}` }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let verifiedAmount: number;
    let verifiedCurrency: string;

    if (isFreeOrder) {
      verifiedAmount = 0;
      verifiedCurrency = 'GHS';
      console.log("Processing free order via promo bypass:", paymentReference);
    } else if (gateway === 'paystack') {

      console.log("Verifying with Paystack...");
      const paystackResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(paymentReference)}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
      );
      const paystackData = await paystackResponse.json();

      if (!paystackData.status || paystackData.data?.status !== "success") {
        return new Response(JSON.stringify({ success: false, error: "Payment verification failed", message: "Paystack payment verification failed" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      verifiedAmount = paystackData.data.amount / 100;
      verifiedCurrency = paystackData.data.currency;
    } else {
      console.log("Verifying with Korapay...");
      const korapayResponse = await fetch(
        `https://api.korapay.com/merchant/api/v1/charges/${encodeURIComponent(paymentReference)}`,
        { headers: { Authorization: `Bearer ${KORAPAY_SECRET_KEY}` } }
      );
      const korapayData = await korapayResponse.json();

      if (!korapayData.status || korapayData.data?.status !== "success") {
        return new Response(JSON.stringify({ success: false, error: "Payment verification failed", message: "Korapay payment verification failed" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      verifiedAmount = korapayData.data.amount;
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
      return new Response(JSON.stringify({ success: false, error: "database_error", message: `Failed to create order: ${orderError.message}` }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 2. Auto-create client project for tracking
    console.log("Creating client project...");
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
      description,
      category: categoryMap[discordCategory] || "web-development",
      status: "pending",
      budget: `GH₵${amountInGhs}`,
    });

    if (projectError) {
      console.error("Failed to create client project (non-critical):", projectError);
      // Don't fail the whole request for this
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
          footer: { text: `Prime Haven • Client Order (Paid via ${gateway === 'paystack' ? 'Paystack' : 'Korapay'})` },
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
    return new Response(JSON.stringify({
      success: false,
      error: "server_error",
      message: error.message || "Unknown internal error",
      details: error.details || error.hint || null
    }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

});

