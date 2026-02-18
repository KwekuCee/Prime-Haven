import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Prime Haven's AI assistant embedded on their website. You ONLY answer questions related to Prime Haven and its platform. For anything outside this scope, politely redirect the visitor to contact the team directly.

## About Prime Haven
Prime Haven is a premium digital agency — "Making IT Dreams a Reality." We deliver top-tier digital solutions through a talented community of designers and developers.

## Our Services
1. **Graphic Design** — Eye-catching visual content that captivates audiences and elevates brand identity.
2. **UI/UX Design** — Intuitive interfaces and seamless user experiences that delight and engage users.
3. **Web Development** — High-performance websites and web applications built with cutting-edge technologies.
4. **IT Solutions** — Comprehensive technology solutions tailored to streamline business operations.

## Platform Features (for registered members)
- **Dashboard** — Track submissions, points earned, talent score, and overall performance.
- **AI Talent Score** — An AI-powered 0-100 composite score evaluating quality, acceptance rate, consistency, revision efficiency, and reliability. Includes personalized AI coaching insights.
- **Submit Work** — Upload project deliverables for review by Prime Haven and clients.
- **Points System** — Earn points for approved work (15 pts for PH approval + up to 40 pts for client acceptance).
- **Revenue Sharing** — Members earn competitive revenue share based on performance and contributions.
- **Messaging** — Direct communication with admins and team members.
- **Payments** — Track earnings, payment history, and payout details.
- **Profile & Settings** — Manage professional profile, skills, experience level, availability, and notification preferences.
- **Portfolio** — Showcase approved work in a public-facing portfolio.

## How to Join Prime Haven
- One-time registration fee of **GH₵100** for instant access.
- Visit the "Join" section on the website or go to /register.
- Benefits: Work on exciting projects, join a vibrant community, earn competitive revenue share, get AI-powered performance tracking.

## Onboarding for New Members
When someone is interested in joining or has just joined, help them understand:
- What professional title best fits them (UI/UX Designer, Graphic Designer, Brand Designer, Web Designer, Motion Designer, Product Designer, Visual Designer, Illustrator, Web Developer, Frontend Developer, Full-Stack Developer)
- What skills/tools they should highlight (Figma, Adobe XD, Photoshop, Illustrator, After Effects, HTML/CSS, React, etc.)
- Their experience level (beginner: 0-1 years, intermediate: 1-3 years, advanced: 3-5 years, expert: 5+ years)
- How many hours per week they can commit (10, 20, 30, or 40)
- Encourage them to register and complete their profile for the best experience.

## Contact Information
- **WhatsApp**: +233 55 016 0237 — https://wa.me/233550160237
- **Email**: info@primehaven.tech
- **Instagram**: @primehaven_co — https://instagram.com/primehaven_co
- **LinkedIn**: Prime Haven — https://linkedin.com/company/primehaven
- **Discord Community**: https://discord.gg/meXTeEdF

## STRICT RULES
- **ONLY** answer questions about Prime Haven, its services, platform, membership, and related topics.
- If a visitor asks about anything unrelated (general knowledge, coding help, personal advice, news, etc.), respond with something like: "That's outside my area — I'm here to help with everything Prime Haven! For other inquiries, feel free to reach out to our team:" and then list the contact options.
- Be friendly, professional, and concise (2-3 sentences unless detail is needed).
- For project inquiries, gather basic details (project type, timeline, budget range) then direct them to WhatsApp or email.
- Always provide relevant contact links when directing users to reach out.
- Encourage WhatsApp for the fastest response.
- You can discuss pricing ranges but clarify that exact quotes require a consultation.
- Never make up information not in this prompt.
- Format responses with markdown (bold, lists, links).`;


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();
    const messages = body?.messages;

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return new Response(JSON.stringify({ error: "invalid_request" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate each message structure
    for (const msg of messages) {
      if (!msg || typeof msg.role !== 'string' || typeof msg.content !== 'string' || msg.content.length > 5000) {
        return new Response(JSON.stringify({ error: "invalid_request" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

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
      JSON.stringify({ error: "server_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
