import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailRequest {
  email: string;
  fullName: string;
  userId: string;
  redirectUrl: string;
}

const generateToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

// Allowed redirect domains for security
const ALLOWED_REDIRECT_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "lovable.app",
  "lovable.dev",
  "lovableproject.com",
  "youthquake-forge.lovable.app",
];

const isAllowedRedirectUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return ALLOWED_REDIRECT_DOMAINS.some(
      (domain) =>
        parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const email = body?.email;
    const fullName = body?.fullName;
    const userId = body?.userId;
    const redirectUrl = body?.redirectUrl;

    // Input validation - email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || email.length > 255 || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate userId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!userId || typeof userId !== 'string' || !uuidRegex.test(userId)) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate redirectUrl - must be from allowed domains
    if (!redirectUrl || typeof redirectUrl !== 'string' || !isAllowedRedirectUrl(redirectUrl)) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize fullName - limit length and remove potential script tags
    const sanitizedName = typeof fullName === 'string' 
      ? fullName.slice(0, 100).replace(/<[^>]*>/g, '').trim() 
      : "Designer";

    // Generate verification token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Store token in database using service role
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { error: tokenError } = await supabase
      .from("email_verification_tokens")
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt,
      });

    if (tokenError) {
      console.error("Token storage error:", tokenError);
      throw new Error("Failed to create verification token");
    }

    // Create verification link
    const verificationLink = `${redirectUrl}/auth/confirm?token=${token}`;

    // Send email via SendGrid with stunning animated design
    const emailResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email }],
          },
        ],
        from: { email: "team@primehaven.tech", name: "Prime Haven" },
        subject: "🚀 Welcome to Prime Haven - Verify Your Email",
        content: [
          {
            type: "text/html",
            value: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to Prime Haven</title>
                <style>
                  @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                  }
                  @keyframes shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                  }
                  @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                  @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                  }
                  @keyframes glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(254, 76, 24, 0.4); }
                    50% { box-shadow: 0 0 40px rgba(254, 76, 24, 0.8); }
                  }
                  body { 
                    font-family: 'Segoe UI', Arial, sans-serif; 
                    background: linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #111111 100%); 
                    color: #fff; 
                    margin: 0; 
                    padding: 40px 20px;
                    min-height: 100vh;
                  }
                  .email-wrapper {
                    max-width: 600px;
                    margin: 0 auto;
                  }
                  .container { 
                    background: linear-gradient(180deg, rgba(20,20,20,0.95) 0%, rgba(10,10,10,0.98) 100%);
                    border-radius: 24px; 
                    padding: 48px 40px; 
                    border: 1px solid rgba(254, 76, 24, 0.2);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7),
                                0 0 0 1px rgba(254, 76, 24, 0.1),
                                inset 0 1px 0 rgba(255,255,255,0.05);
                    position: relative;
                    overflow: hidden;
                  }
                  .container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, #fe4c18, #ff7a45, #fe4c18);
                    background-size: 200% 100%;
                    animation: shimmer 3s linear infinite;
                  }
                  .logo-section { 
                    text-align: center; 
                    margin-bottom: 40px;
                    animation: fadeInUp 0.6s ease-out;
                  }
                  .logo-container {
                    display: inline-block;
                    padding: 20px;
                    background: radial-gradient(circle at center, rgba(254, 76, 24, 0.15) 0%, transparent 70%);
                    border-radius: 20px;
                    animation: float 4s ease-in-out infinite;
                  }
                  .welcome-badge {
                    display: inline-block;
                    background: linear-gradient(135deg, rgba(254, 76, 24, 0.2) 0%, rgba(255, 122, 69, 0.1) 100%);
                    border: 1px solid rgba(254, 76, 24, 0.3);
                    color: #fe4c18;
                    padding: 8px 20px;
                    border-radius: 50px;
                    font-size: 12px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    margin-bottom: 20px;
                    animation: fadeInUp 0.6s ease-out 0.1s backwards;
                  }
                  h1 { 
                    color: #fff; 
                    font-size: 32px; 
                    font-weight: 800;
                    margin: 0 0 8px 0;
                    background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    animation: fadeInUp 0.6s ease-out 0.2s backwards;
                  }
                  .name-highlight {
                    color: #fe4c18;
                    -webkit-text-fill-color: #fe4c18;
                  }
                  .subtitle {
                    color: #888;
                    font-size: 16px;
                    margin: 0;
                    animation: fadeInUp 0.6s ease-out 0.3s backwards;
                  }
                  .content-section {
                    animation: fadeInUp 0.6s ease-out 0.4s backwards;
                  }
                  p { 
                    color: #b0b0b0; 
                    line-height: 1.7; 
                    margin-bottom: 20px;
                    font-size: 15px;
                  }
                  .highlight-box {
                    background: linear-gradient(135deg, rgba(254, 76, 24, 0.1) 0%, rgba(255, 122, 69, 0.05) 100%);
                    border: 1px solid rgba(254, 76, 24, 0.2);
                    border-radius: 16px;
                    padding: 24px;
                    margin: 30px 0;
                    text-align: center;
                  }
                  .highlight-box p {
                    margin: 0 0 16px 0;
                    color: #ccc;
                  }
                  .cta-button { 
                    display: inline-block; 
                    background: linear-gradient(135deg, #fe4c18 0%, #ff6b35 50%, #fe4c18 100%);
                    background-size: 200% 100%;
                    color: #000 !important; 
                    text-decoration: none; 
                    padding: 18px 48px; 
                    border-radius: 12px; 
                    font-weight: 700;
                    font-size: 16px;
                    letter-spacing: 0.5px;
                    transition: all 0.3s ease;
                    animation: glow 2s ease-in-out infinite, shimmer 3s linear infinite;
                    box-shadow: 0 10px 30px -10px rgba(254, 76, 24, 0.5);
                  }
                  .cta-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 15px 40px -10px rgba(254, 76, 24, 0.6);
                  }
                  .expire-notice {
                    display: inline-block;
                    background: rgba(255, 255, 255, 0.05);
                    color: #888;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 13px;
                    margin-top: 16px;
                  }
                  .expire-notice strong {
                    color: #fe4c18;
                  }
                  .divider {
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(254, 76, 24, 0.3), transparent);
                    margin: 40px 0;
                  }
                  .community-section {
                    text-align: center;
                    animation: fadeInUp 0.6s ease-out 0.5s backwards;
                  }
                  .section-label {
                    color: #666;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 3px;
                    margin-bottom: 20px;
                  }
                  .social-buttons {
                    display: flex;
                    justify-content: center;
                    gap: 16px;
                    flex-wrap: wrap;
                  }
                  .social-button { 
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 14px 28px; 
                    border-radius: 12px; 
                    text-decoration: none; 
                    font-weight: 600; 
                    font-size: 14px;
                    transition: all 0.3s ease;
                  }
                  .discord-button { 
                    background: linear-gradient(135deg, #5865F2 0%, #7289DA 100%);
                    color: #fff !important;
                    box-shadow: 0 8px 24px -8px rgba(88, 101, 242, 0.5);
                  }
                  .discord-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 32px -8px rgba(88, 101, 242, 0.6);
                  }
                  .instagram-button { 
                    background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
                    color: #fff !important;
                    box-shadow: 0 8px 24px -8px rgba(220, 39, 67, 0.5);
                  }
                  .instagram-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 32px -8px rgba(220, 39, 67, 0.6);
                  }
                  .features-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                    margin: 30px 0;
                    animation: fadeInUp 0.6s ease-out 0.6s backwards;
                  }
                  .feature-item {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 20px 16px;
                    text-align: center;
                  }
                  .feature-icon {
                    font-size: 28px;
                    margin-bottom: 10px;
                    display: block;
                  }
                  .feature-text {
                    color: #888;
                    font-size: 12px;
                    font-weight: 500;
                    margin: 0;
                  }
                  .footer { 
                    margin-top: 40px; 
                    padding-top: 30px; 
                    border-top: 1px solid rgba(255,255,255,0.05);
                    text-align: center; 
                    animation: fadeInUp 0.6s ease-out 0.7s backwards;
                  }
                  .footer p {
                    color: #555; 
                    font-size: 12px;
                    margin: 8px 0;
                  }
                  .footer a {
                    color: #fe4c18;
                    text-decoration: none;
                  }
                  .tagline {
                    color: #fe4c18;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    margin-top: 16px;
                  }
                </style>
              </head>
              <body>
                <div class="email-wrapper">
                  <div class="container">
                    <div class="logo-section">
                      <div class="logo-container">
                        <img src="https://kbxijzsrywcwnyvtbruh.supabase.co/storage/v1/object/public/email-assets/prime-haven-logo.png?v=1" alt="Prime Haven" style="max-width: 160px; height: auto;" />
                      </div>
                    </div>
                    
                    <div style="text-align: center;">
                      <span class="welcome-badge">✨ New Member</span>
                      <h1>Welcome, <span class="name-highlight">${sanitizedName}</span>!</h1>
                      <p class="subtitle">You're one step away from joining our creative community</p>
                    </div>
                    
                    <div class="content-section">
                      <div class="highlight-box">
                        <p>Click the button below to verify your email and unlock your designer dashboard:</p>
                        <a href="${verificationLink}" class="cta-button">
                          ⚡ Verify My Email
                        </a>
                        <div class="expire-notice">
                          ⏰ This link expires in <strong>24 hours</strong>
                        </div>
                      </div>
                      
                      <div class="features-grid">
                        <div class="feature-item">
                          <span class="feature-icon">🎨</span>
                          <p class="feature-text">Creative Projects</p>
                        </div>
                        <div class="feature-item">
                          <span class="feature-icon">💰</span>
                          <p class="feature-text">Earn Points</p>
                        </div>
                        <div class="feature-item">
                          <span class="feature-icon">🚀</span>
                          <p class="feature-text">Grow Skills</p>
                        </div>
                      </div>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div class="community-section">
                      <p class="section-label">Join Our Community</p>
                      <div class="social-buttons">
                        <a href="https://discord.gg/meXTeEdF" class="social-button discord-button">
                          🎮 Discord Server
                        </a>
                        <a href="https://instagram.com/primehaven_co" class="social-button instagram-button">
                          📸 Instagram
                        </a>
                      </div>
                    </div>
                    
                    <div class="footer">
                      <p>If you didn't create an account, you can safely ignore this email.</p>
                      <p>Questions? Contact us at <a href="mailto:team@primehaven.tech">team@primehaven.tech</a></p>
                      <p class="tagline">Making IT Dreams a Reality</p>
                      <p>© 2026 Prime Haven. Youth-driven design & IT solutions.</p>
                    </div>
                  </div>
                </div>
              </body>
              </html>
            `,
          },
        ],
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("SendGrid error:", errorText);
      throw new Error("Failed to send verification email");
    }

    console.log("Verification email sent successfully to:", email);

    return new Response(
      JSON.stringify({ success: true, message: "Verification email sent" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-verification-email:", error);
    // Return generic error - don't expose internal details
    return new Response(
      JSON.stringify({ success: false, error: "email_send_failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
