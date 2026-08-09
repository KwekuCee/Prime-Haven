import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerifyRequest {
  token: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const token = body?.token;

    // Input validation - token format check
    if (!token || typeof token !== 'string' || token.length < 32 || token.length > 128) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_token" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate token contains only valid hex characters
    if (!/^[a-f0-9]+$/i.test(token)) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_token" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Find the token
    const { data: tokenData, error: fetchError } = await supabase
      .from("email_verification_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !tokenData) {
      console.error("Token not found:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "invalid", message: "Invalid or expired verification token" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if token has expired
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      // Delete expired token
      await supabase
        .from("email_verification_tokens")
        .delete()
        .eq("id", tokenData.id);

      return new Response(
        JSON.stringify({ success: false, error: "expired", message: "Verification token has expired" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Update profile to mark email as verified
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ email_verified: true })
      .eq("id", tokenData.user_id);

    if (updateError) {
      console.error("Failed to update profile:", updateError);
      throw new Error("Failed to verify email");
    }

    // Delete the used token
    await supabase
      .from("email_verification_tokens")
      .delete()
      .eq("id", tokenData.id);

    console.log("Email verified successfully for user:", tokenData.user_id);

    return new Response(
      JSON.stringify({ success: true, message: "Email verified successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in verify-email:", error);
    // Return generic error - don't expose internal details
    return new Response(
      JSON.stringify({ success: false, error: "server_error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
