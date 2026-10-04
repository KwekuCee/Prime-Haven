import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { alertOwner, INFO_ADDRESS } from "../_shared/resend.ts";
import { withCors } from "../_shared/cors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(5).max(20),
  companyName: z.string().trim().max(100).nullable().optional(),
  serviceInterest: z.string().trim().min(1).max(60),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredTime: z.string().trim().min(1).max(20),
  message: z.string().trim().max(500).nullable().optional(),
});

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, message: "Method not allowed" }, 405);
  try {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ success: false, message: "Please check the form fields and try again." }, 400);
    const d = parsed.data;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { data: rl } = await supabase.rpc("check_rate_limit", { p_action: "consultation_booking", p_identifier: `${d.email}|${ip}` });
    if (rl && (rl as { allowed?: boolean }).allowed === false) {
      return json({ success: false, message: "Too many booking attempts. Please try again later." }, 429);
    }

    const { error } = await supabase.from("consultation_bookings").insert({
      full_name: d.fullName, email: d.email, phone: d.phone, company_name: d.companyName || null,
      service_interest: d.serviceInterest, preferred_date: d.preferredDate, preferred_time: d.preferredTime,
      message: d.message || null,
    });
    if (error) {
      console.error("consultation insert failed:", error);
      return json({ success: false, message: "We could not save your booking. Please try again." }, 500);
    }

    await alertOwner(INFO_ADDRESS, "New consultation booking", {
      Name: d.fullName, Email: d.email, Phone: d.phone, Company: d.companyName, Service: d.serviceInterest,
      Date: d.preferredDate, Time: d.preferredTime, Message: d.message,
    }, "/superadmin");

    return json({ success: true });
  } catch (e) {
    console.error("submit-consultation error:", e);
    return json({ success: false, message: "Something went wrong. Please try again." }, 500);
  }
}));
