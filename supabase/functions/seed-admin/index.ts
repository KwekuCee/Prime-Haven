import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get admin credentials from request body (required for security)
    const { email, password, name } = await req.json();

    // Validate required fields
    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Email and password are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate password strength (minimum 12 characters, mixed case, numbers, symbols)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{12,}$/;
    if (!passwordRegex.test(password)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Password must be at least 12 characters with uppercase, lowercase, number, and special character" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const adminEmail = email;
    const adminPassword = password;
    const adminName = name || "Admin";

    // Check if admin already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingAdmin = existingUsers?.users?.find(u => u.email === adminEmail);

    if (existingAdmin) {
      console.log("Admin user already exists, checking role...");
      
      // Ensure they have superadmin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", existingAdmin.id)
        .single();

      if (roleData?.role !== "masteradmin") {
        await supabase
          .from("user_roles")
          .upsert({ user_id: existingAdmin.id, role: "masteradmin" }, { onConflict: "user_id" });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Admin user already exists",
          email: adminEmail 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create new admin user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: adminName }
    });

    if (authError) {
      console.error("Error creating admin user:", authError);
      return new Response(
        JSON.stringify({ success: false, error: authError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Admin user created:", authData.user.id);

    // The handle_new_user trigger creates profile and designer role
    // We need to update the role to masteradmin
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for trigger

    const { error: roleError } = await supabase
      .from("user_roles")
      .update({ role: "masteradmin" })
      .eq("user_id", authData.user.id);

    if (roleError) {
      console.error("Error updating role:", roleError);
    }

    // Log the creation
    await supabase.from("system_logs").insert({
      action_type: "admin_created",
      description: `Master admin account created: ${adminEmail}`,
      timestamp: new Date().toISOString(),
    });

    console.log("Admin setup complete");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Admin user created successfully",
        email: adminEmail
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error in seed-admin:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
