import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AdminLoginRequest {
  username?: string;
  email?: string;
  password: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { username, email, password }: AdminLoginRequest = await req.json();

    // Input validation - support both username and email for backwards compatibility
    const loginIdentifier = username || email;
    
    if (!loginIdentifier || typeof loginIdentifier !== 'string' || loginIdentifier.length > 255) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_credentials" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!password || typeof password !== 'string' || password.length > 128) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_credentials" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    let userEmail = loginIdentifier;

    // If username is provided (not an email), look up the email from profiles
    if (username && !username.includes('@')) {
      console.log("Looking up user by username:", username);
      
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", username)
        .maybeSingle();

      if (profileError || !profileData) {
        console.log("Username lookup failed:", profileError?.message || "User not found");
        return new Response(
          JSON.stringify({ success: false, error: "invalid_credentials" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      userEmail = profileData.email;
      console.log("Found email for username:", userEmail);
    }

    // Authenticate using Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    });

    if (authError || !authData.user) {
      console.log("Admin login failed: invalid credentials");
      return new Response(
        JSON.stringify({ success: false, error: "invalid_credentials" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user has admin role (superadmin or masteradmin)
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id)
      .single();

    if (roleError || !roleData) {
      console.log("Admin login failed: no role found for user");
      return new Response(
        JSON.stringify({ success: false, error: "access_denied" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const validAdminRoles = ["superadmin", "masteradmin"];
    if (!validAdminRoles.includes(roleData.role)) {
      console.log("Admin login failed: user is not an admin, role:", roleData.role);
      return new Response(
        JSON.stringify({ success: false, error: "access_denied" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get profile information
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, email, username")
      .eq("id", authData.user.id)
      .single();

    // Log admin login
    await supabase.from("system_logs").insert({
      action_type: "admin_login",
      admin_id: authData.user.id,
      description: `Admin login: ${profileData?.full_name || profileData?.username || userEmail}`,
      timestamp: new Date().toISOString(),
    });

    console.log("Admin login successful:", authData.user.id);

    return new Response(
      JSON.stringify({
        success: true,
        session: authData.session,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          username: profileData?.username,
          name: profileData?.full_name || profileData?.username || "Admin",
          role: roleData.role,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in admin-login:", error);
    // Return generic error message - don't expose internal details
    return new Response(
      JSON.stringify({ success: false, error: "server_error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
