import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Recipient {
    email: string;
    name: string;
}

interface BroadcastResult {
    email: string;
    status: "sent" | "failed";
    error?: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: req.headers.get("Authorization")! } },
        });

        // 1. Verify Authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // 2. Verify Authorization (Admin only)
        const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .single();

        if (!roleData || !["superadmin", "masteradmin"].includes(roleData.role)) {
            return new Response(JSON.stringify({ error: "Forbidden" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const { audience, subject, body, userId } = await req.json();

        if (!audience || !subject || !body) {
            return new Response(JSON.stringify({ error: "Missing required fields: audience, subject, body" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // 3. Fetch Recipients
        let recipients: Recipient[] = [];
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const adminClient = createClient(supabaseUrl, serviceRoleKey);

        if (audience === "individual") {
            if (!userId || typeof userId !== "string") {
                return new Response(JSON.stringify({ error: "userId is required for individual audience" }), {
                    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
            // Try profiles first
            const { data: prof } = await adminClient
                .from("profiles")
                .select("email, full_name")
                .eq("id", userId)
                .maybeSingle();
            if (prof?.email) {
                recipients = [{ email: prof.email, name: prof.full_name || "User" }];
            } else {
                // Fall back to clients table (id is uuid here too)
                const { data: cli } = await adminClient
                    .from("clients")
                    .select("email, name")
                    .eq("id", userId)
                    .maybeSingle();
                if (cli?.email) recipients = [{ email: cli.email, name: cli.name || "Client" }];
            }
        } else if (audience === "designers") {
            const { data: roleRows } = await adminClient
                .from("user_roles")
                .select("user_id")
                .eq("role", "designer");
            const ids = (roleRows || []).map((r: any) => r.user_id);
            if (ids.length > 0) {
                const { data } = await adminClient
                    .from("profiles")
                    .select("email, full_name")
                    .in("id", ids);
                recipients = (data || [])
                    .filter((p: any) => p.email)
                    .map((p: any) => ({ email: p.email, name: p.full_name || "Designer" }));
            }

        } else if (audience === "admins") {
            const { data: roleRows } = await adminClient
                .from("user_roles")
                .select("user_id")
                .in("role", ["superadmin", "masteradmin"]);
            const ids = (roleRows || []).map((r: any) => r.user_id);
            if (ids.length > 0) {
                const { data } = await adminClient
                    .from("profiles")
                    .select("email, full_name")
                    .in("id", ids);
                recipients = (data || [])
                    .filter((p: any) => p.email)
                    .map((p: any) => ({ email: p.email, name: p.full_name || "Admin" }));
            }

        } else if (audience === "clients") {
            const { data } = await adminClient
                .from("clients")
                .select("email, name");

            recipients = (data || [])
                .filter((c: any) => c.email)
                .map((c: any) => ({ email: c.email, name: c.name || "Client" }));

        } else {
            // audience === "all"
            const { data } = await adminClient
                .from("profiles")
                .select("email, full_name");

            recipients = (data || [])
                .filter((p: any) => p.email)
                .map((p: any) => ({ email: p.email, name: p.full_name || "User" }));
        }

        console.log(`Found ${recipients.length} recipients for audience: ${audience}`);

        if (recipients.length === 0) {
            return new Response(JSON.stringify({ success: true, message: "No recipients found" }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 4. Setup Transporter
        const smtpHost = Deno.env.get("SMTP_HOST")!;
        const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
        const smtpUser = Deno.env.get("SMTP_USER")!;
        const smtpPass = Deno.env.get("SMTP_PASS")!;

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass },
        });

        const currentYear = new Date().getFullYear();

        // 5. Send Individual Emails
        const results: BroadcastResult[] = [];

        // Using for-of loop for sequential processing to avoid overwhelming SMTP
        for (const recipient of recipients) {
            try {
                const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 0; background: #f9fafb; color: #111827;">
  <div style="background: #000000; padding: 32px 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 800;">PRIME HAVEN</h1>
    <p style="color: #9ca3af; font-size: 11px; margin: 8px 0 0; text-transform: uppercase; letter-spacing: 2px;">Creative Studio Platform</p>
  </div>
  <div style="background: #ffffff; padding: 40px 32px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
    <p style="margin: 0 0 20px; font-size: 16px; font-weight: 600;">Hello ${String(recipient.name).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')},</p>
    <div style="line-height: 1.7; font-size: 15px; color: #374151;">
      ${String(body).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g, '<br>')}
    </div>
  </div>
  <div style="background: #f3f4f6; text-align: center; padding: 32px 20px; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin: 0 0 8px; font-weight: 600; color: #4b5563;">Prime Haven Creative Studio</p>
    <p style="margin: 0;">This is an official communication sent via the Prime Haven platform.</p>
    <p style="margin: 16px 0 0; color: #9ca3af;">© ${currentYear} Prime Haven. All rights reserved.</p>
  </div>
</body>
</html>`;

                await transporter.sendMail({
                    from: `"Prime Haven Team" <${smtpUser}>`,
                    to: recipient.email,
                    subject: subject,
                    html: htmlBody,
                    text: body,
                });
                results.push({ email: recipient.email, status: "sent" });
            } catch (err: any) {
                console.error(`Failed to send to ${recipient.email}:`, err);
                results.push({ email: recipient.email, status: "failed", error: err.message });
            }
        }

        // 6. Log the action
        const totalSent = results.filter(r => r.status === "sent").length;
        await adminClient.from("system_logs").insert({
            action_type: "email_broadcast_completed",
            admin_id: user.id,
            description: `Broadcast sent to ${recipients.length} recipients in "${audience}". Total successfully sent: ${totalSent}`,
            timestamp: new Date().toISOString(),
        });

        return new Response(JSON.stringify({
            success: true,
            recipientsCount: recipients.length,
            sentCount: totalSent,
            results
        }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Broadcast email error:", error);
        return new Response(JSON.stringify({ error: "email_send_failed" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
