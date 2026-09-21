// @ts-nocheck
// Issues a short-lived signed upload URL so applicants can send us their CV,
// portfolio or practical task without the private bucket being publicly writable.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json, limited } from "../_shared/applicants.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const ALLOWED_EXT = ["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp", "zip", "ai", "psd", "fig", "svg"];
const KINDS = ["cv", "portfolio", "practical"];

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const kind = String(body.kind || "");
    const fileName = String(body.fileName || "").trim();

    if (!KINDS.includes(kind)) return json({ success: false, error: "invalid_kind" }, 400);
    if (!fileName || fileName.length > 200) return json({ success: false, error: "invalid_file_name" }, 400);

    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXT.includes(ext)) {
      return json({ success: false, error: "unsupported_file_type", message: "That file type is not accepted." }, 400);
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await limited(supabase, "applicant_upload", ip)) {
      return json({ success: false, error: "rate_limited", message: "Too many uploads. Please try again later." }, 429);
    }

    const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
    const path = `${kind}/${crypto.randomUUID()}/${safe}`;

    const { data, error } = await supabase.storage.from("applicant-files").createSignedUploadUrl(path);
    if (error) {
      console.error("createSignedUploadUrl failed:", error);
      return json({ success: false, error: "upload_url_failed" }, 500);
    }

    return json({ success: true, path, token: data.token, signedUrl: data.signedUrl });
  } catch (err) {
    console.error("applicant-upload-url error:", err);
    return json({ success: false, error: "unexpected_error" }, 500);
  }
});
