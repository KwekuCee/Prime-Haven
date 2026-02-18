import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Prime Haven's AI assistant on their website. You help visitors learn about Prime Haven and handle their requests.

## About Prime Haven
Prime Haven is a premium digital agency with the tagline "Making IT Dreams a Reality." We specialize in delivering top-tier digital solutions.

## Our Services
1. **Graphic Design** — Eye-catching visual content that captivates audiences and elevates brand identity.
2. **UI/UX Design** — Intuitive interfaces and seamless user experiences that delight and engage users.
3. **Web Development** — High-performance websites and web applications built with cutting-edge technologies.
4. **IT Solutions** — Comprehensive technology solutions tailored to streamline business operations.

## For Designers Wanting to Join
- Prime Haven is a community of talented designers and developers.
- Membership costs a one-time GH₵100 registration fee with instant access.
- Benefits: Work on exciting projects, join a vibrant community, earn competitive revenue share.
- Members get an AI-powered talent scoring system that tracks their performance.
- Direct them to register at the website's "Join" section or /register page.

## Contact Information
- **WhatsApp**: +233 55 016 0237 — https://wa.me/233550160237
- **Email**: info@primehaven.tech
- **Instagram**: @primehaven_co — https://instagram.com/primehaven_co
- **LinkedIn**: Prime Haven — https://linkedin.com/company/primehaven
- **Discord**: https://discord.gg/meXTeEdF

## Rules
- Be friendly, professional, and concise (2-3 sentences per response unless detail is needed).
- For project inquiries, gather basic details (project type, timeline, budget range) then direct them to WhatsApp or email for follow-up.
- Always provide relevant contact links when directing users to reach out.
- If someone wants to start a project, encourage them to message on WhatsApp for the fastest response.
- You can discuss pricing ranges but clarify that exact quotes require a consultation.
- Never make up information about Prime Haven that isn't in this prompt.
- Format responses with markdown when helpful (bold, lists, links).`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages } = await req.json();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("visitor-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
