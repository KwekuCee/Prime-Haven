import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SignedUrlRequest {
  filePath: string;
  expiresIn?: number;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    
    
    // Create client with user's token for auth verification
    const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Verify the token and get user claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: "unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub;
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { filePath, expiresIn = 3600 }: SignedUrlRequest = await req.json();

    // Input validation
    if (!filePath || typeof filePath !== "string" || filePath.length > 500) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize file path - prevent path traversal
    if (filePath.includes("..") || filePath.startsWith("/")) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate expiresIn (1 minute to 1 hour)
    const validExpiresIn = Math.min(Math.max(Number(expiresIn) || 3600, 60), 604800); // up to 7 days

    // Use service role to generate signed URL
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check user's role for access control
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    const isAdmin = roleData?.role === "superadmin" || roleData?.role === "masteradmin";
    
    // Extract user folder from file path
    const fileOwner = filePath.split("/")[0];
    
    // Verify access: user can only access their own files unless admin
    if (!isAdmin && fileOwner !== userId) {
      console.log("Access denied: user cannot access other users' files");
      return new Response(
        JSON.stringify({ success: false, error: "access_denied" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from("submissions")
      .createSignedUrl(filePath, validExpiresIn);

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError.message);
      return new Response(
        JSON.stringify({ success: false, error: "file_not_found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Signed URL generated for:", filePath);

    return new Response(
      JSON.stringify({
        success: true,
        signedUrl: signedUrlData.signedUrl,
        expiresIn: validExpiresIn,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in get-signed-url:", error);
    return new Response(
      JSON.stringify({ success: false, error: "server_error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
