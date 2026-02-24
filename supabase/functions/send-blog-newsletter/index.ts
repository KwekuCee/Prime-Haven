import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Verify admin role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["superadmin", "masteradmin"].includes(roleData.role)) {
      throw new Error("Admin access required");
    }

    const { postId } = await req.json();
    if (!postId) throw new Error("postId is required");

    // Get the blog post
    const { data: post, error: postError } = await adminClient
      .from("blog_posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (postError || !post) throw new Error("Blog post not found");
    if (!post.is_published) throw new Error("Post must be published first");

    // Get active subscribers
    const { data: subscribers } = await adminClient
      .from("newsletter_subscribers")
      .select("email")
      .eq("is_active", true);

    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ message: "No subscribers to notify" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl = "https://primehaven.lovable.app";

    const encodeHtml = (str: string) =>
      str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#111;border-radius:12px;overflow:hidden;">
  <tr><td style="padding:30px;text-align:center;background:linear-gradient(135deg,#e8530e,#f59e0b);">
    <h1 style="color:#fff;margin:0;font-size:24px;">Prime Haven Blog</h1>
  </td></tr>
  <tr><td style="padding:30px;">
    ${post.cover_image_url ? `<img src="${encodeHtml(post.cover_image_url)}" alt="${encodeHtml(post.title)}" style="width:100%;border-radius:8px;margin-bottom:20px;" />` : ""}
    <h2 style="color:#fff;margin:0 0 12px;font-size:22px;">${encodeHtml(post.title)}</h2>
    <p style="color:#999;font-size:12px;margin:0 0 16px;">Category: ${encodeHtml(post.category)} | ${new Date(post.published_at).toLocaleDateString()}</p>
    <p style="color:#ccc;font-size:15px;line-height:1.6;margin:0 0 24px;">${encodeHtml(post.excerpt)}</p>
    <a href="${siteUrl}/blog/${encodeHtml(post.slug)}" style="display:inline-block;background:linear-gradient(135deg,#e8530e,#f59e0b);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">Read Full Post</a>
  </td></tr>
  <tr><td style="padding:20px 30px;border-top:1px solid #222;text-align:center;">
    <p style="color:#666;font-size:12px;margin:0;">You're receiving this because you subscribed to the Prime Haven newsletter.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

    // Send via SMTP
    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get("SMTP_HOST")!,
        port: parseInt(Deno.env.get("SMTP_PORT") || "465"),
        tls: true,
        auth: {
          username: Deno.env.get("SMTP_USER")!,
          password: Deno.env.get("SMTP_PASS")!,
        },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscribers) {
      try {
        await client.send({
          from: `Prime Haven <${Deno.env.get("SMTP_USER")}>`,
          to: sub.email,
          subject: `📰 ${post.title} — Prime Haven Blog`,
          content: "auto",
          html: emailHtml,
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${sub.email}:`, err);
        failed++;
      }
    }

    await client.close();

    return new Response(
      JSON.stringify({ message: `Newsletter sent to ${sent} subscribers (${failed} failed)` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Newsletter error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
