import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { email, password, fullName, professionalTitle } = await req.json();

  // Find or create auth user
  const { data: list } = await supabase.auth.admin.listUsers();
  let user = list?.users?.find((u: any) => u.email === email);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    user = data.user!;
  } else {
    await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  }

  // Wait for trigger
  await new Promise((r) => setTimeout(r, 800));

  await supabase.from("profiles").upsert({
    id: user.id, email, full_name: fullName,
    email_verified: true, registration_fee_paid: true,
  }, { onConflict: "id" });

  await supabase.from("user_roles").upsert({ user_id: user.id, role: "designer" }, { onConflict: "user_id,role" });

  await supabase.from("designer_details").upsert({
    user_id: user.id,
    professional_title: professionalTitle,
    professions: [professionalTitle],
  }, { onConflict: "user_id" });

  return new Response(JSON.stringify({ success: true, userId: user.id }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
