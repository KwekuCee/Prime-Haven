// @ts-nocheck
// Public: records a direct hire request from a hiring track page and notifies the team.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

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
const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const escapeHtml = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const body = await req.json().catch(() => ({}));
    const fullName = str(body.fullName, 120);
    const email = str(body.email, 200).toLowerCase();
    const whatsapp = str(body.whatsapp, 40);
    const serviceSlug = str(body.serviceSlug, 60);
    const serviceLabel = str(body.serviceLabel, 120);
    const tier = str(body.tier, 60);
    const budget = str(body.budget, 60);
    const deadline = str(body.deadline, 20);
    const brief = str(body.brief, 4000);
    const referenceImages = Array.isArray(body.referenceImages)
      ? body.referenceImages.slice(0, 6).map((p: unknown) => str(p, 400)).filter(Boolean)
      : [];

    if (!fullName || !EMAIL_RE.test(email) || !serviceSlug || brief.length < 10) {
      return json({ success: false, error: "invalid_request", message: "Please fill in your name, a valid email and a short brief." }, 400);
    }

    const { data: limit } = await supabase.rpc("check_rate_limit", {
      p_action: "hire_request",
      p_identifier: email,
    });
    if (limit && limit.allowed === false) {
      return json(
        { success: false, error: "rate_limited", message: "You have sent several requests already. Please try again later.", retry_after_seconds: limit.retry_after_seconds },
        429,
      );
    }

    const { data: inserted, error } = await supabase
      .from("hire_requests")
      .insert({
        full_name: fullName,
        email,
        whatsapp: whatsapp || null,
        service_slug: serviceSlug,
        service_label: serviceLabel || null,
        tier: tier || null,
        budget: budget || null,
        deadline: /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : null,
        brief,
        reference_images: referenceImages,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("hire_request insert failed:", error);
      return json({ success: false, error: "insert_failed", message: "We could not save your request. Please try again." }, 500);
    }

    // Best-effort internal notification.
    try {
      await supabase.from("notifications").insert({
        user_id: null,
        title: "New hire request",
        message: `${fullName} wants ${serviceLabel || serviceSlug}${tier ? ` (${tier})` : ""}.`,
        type: "hire_request",
        link: "/superadmin/hire-requests",
      });
    } catch (_e) { /* non-fatal */ }

    let emailSent = false;
    if (SMTP_USER && SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: Deno.env.get("SMTP_HOST") || "smtp.gmail.com",
          port: Number(Deno.env.get("SMTP_PORT") || 465),
          secure: true,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        });
        await transporter.sendMail({
          from: `"Prime Haven" <${SMTP_USER}>`,
          to: SMTP_USER,
          replyTo: email,
          subject: `New hire request — ${serviceLabel || serviceSlug}`,
          html: `
            <h2 style="font-family:Arial,sans-serif">New hire request</h2>
            <table style="font-family:Arial,sans-serif;font-size:14px" cellpadding="6">
              <tr><td><b>Name</b></td><td>${escapeHtml(fullName)}</td></tr>
              <tr><td><b>Email</b></td><td>${escapeHtml(email)}</td></tr>
              <tr><td><b>WhatsApp</b></td><td>${escapeHtml(whatsapp || "—")}</td></tr>
              <tr><td><b>Service</b></td><td>${escapeHtml(serviceLabel || serviceSlug)}</td></tr>
              <tr><td><b>Package</b></td><td>${escapeHtml(tier || "—")}</td></tr>
              <tr><td><b>Budget</b></td><td>${escapeHtml(budget || "—")}</td></tr>
              <tr><td><b>Deadline</b></td><td>${escapeHtml(deadline || "—")}</td></tr>
              <tr><td valign="top"><b>Brief</b></td><td>${escapeHtml(brief).replace(/\n/g, "<br/>")}</td></tr>
            </table>`,
        });
        emailSent = true;
      } catch (mailErr) {
        console.error("hire request email failed:", mailErr);
      }
    }

    return json({ success: true, id: inserted?.id ?? null, emailSent });
  } catch (err) {
    console.error("submit-hire-request error:", err);
    return json({ success: false, error: "unexpected", message: "Something went wrong. Please try again." }, 500);
  }
});
