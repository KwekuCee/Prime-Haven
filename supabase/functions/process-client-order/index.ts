import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const KORAPAY_SECRET_KEY = Deno.env.get("KORAPAY_SECRET_KEY");
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
      description, discordCategory, paymentReference, referenceFiles
    } = body;

    if (!clientName || !clientEmail || !serviceType || !tier || !price || !paymentReference) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify payment with Korapay
    const korapayResponse = await fetch(
      `https://api.korapay.com/merchant/api/v1/charges/${encodeURIComponent(paymentReference)}`,
      { headers: { Authorization: `Bearer ${KORAPAY_SECRET_KEY}` } }
    );
    const korapayData = await korapayResponse.json();

    if (!korapayData.status || korapayData.data?.status !== "success") {
      return new Response(JSON.stringify({ success: false, error: "Payment verification failed" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Use verified amount from Korapay
    const verifiedAmount = korapayData.data.amount;
    const verifiedCurrency = korapayData.data.currency;

    // Convert to GHS for storage if paid in USD
    const amountInGhs = verifiedCurrency === 'USD' ? verifiedAmount * USD_TO_GHS : verifiedAmount;

    // Validate currency
    if (verifiedCurrency !== "GHS" && verifiedCurrency !== "USD") {
      return new Response(JSON.stringify({ success: false, error: "Invalid payment currency" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check for duplicate payment reference
    const { data: existingOrder } = await supabase
      .from("client_orders")
      .select("id")
      .eq("payment_reference", paymentReference)
      .maybeSingle();

    if (existingOrder) {
      return new Response(JSON.stringify({ success: false, error: "Payment already processed" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 1. Create client order using verified amount (stored in GHS)
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
      throw new Error("Failed to create order");
    }

    // 2. Auto-create client project for tracking
    const categoryMap: Record<string, string> = {
      "graphic-design": "graphic-design",
      "app-design": "ui-ux",
      "web-dev": "web-development",
    };

    await supabase.from("client_projects").insert({
      title: `${serviceLabel} (${tier.charAt(0).toUpperCase() + tier.slice(1)}) — ${clientName}`,
      client_name: clientName,
      client_email: clientEmail,
      client_whatsapp: clientWhatsapp || null,
      description,
      category: categoryMap[discordCategory] || "web-development",
      status: "pending",
      budget: `GH₵${amountInGhs}`,
    });

    // 3. Add revenue to the respective service category
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

    // 4. Post to Discord
    let discordMessageId: string | null = null;
    const channelId = DISCORD_CHANNELS[discordCategory];

    if (channelId && DISCORD_BOT_TOKEN) {
      const displayAmount = verifiedCurrency === 'USD'
        ? `$${verifiedAmount.toLocaleString()} USD (≈ GH₵${amountInGhs.toLocaleString()})`
        : `GH₵${amountInGhs.toLocaleString()}`;

      const embed = {
        title: `🆕 New Client Order: ${encodeHtml(serviceLabel)}`,
        description: description ? encodeHtml(description.slice(0, 2048)) : "No description provided",
        color: 0x22c55e,
        fields: [
          { name: "👤 Client", value: encodeHtml(clientName), inline: true },
          { name: "📧 Email", value: encodeHtml(clientEmail), inline: true },
          { name: "📦 Package", value: `${tier.charAt(0).toUpperCase() + tier.slice(1)}`, inline: true },
          { name: "💰 Amount Paid", value: displayAmount, inline: true },
          ...(clientWhatsapp ? [{ name: "📱 WhatsApp", value: encodeHtml(clientWhatsapp), inline: true }] : []),
        ],
        footer: { text: "Prime Haven • Client Order (Paid via Korapay)" },
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

    // 5. Log the action
    await supabase.from("system_logs").insert({
      action_type: "client_order_created",
      description: `New client order: ${serviceLabel} (${tier}) by ${clientName} — GH₵${amountInGhs} (${verifiedCurrency})`,
      new_value: { order_id: order?.id, service_type: serviceType, tier, price: amountInGhs, payment_reference: paymentReference, original_currency: verifiedCurrency },
    });

    return new Response(JSON.stringify({ success: true, orderId: order?.id }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in process-client-order:", error);
    return new Response(JSON.stringify({ success: false, error: "server_error" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
