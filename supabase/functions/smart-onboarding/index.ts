import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Prime Haven's Smart Onboarding AI assistant. Your job is to interview new designers to build their professional profile.

You need to gather the following information through natural conversation:
1. Professional title (must be one of: UI/UX Designer, Graphic Designer, Brand Designer, Web Designer, Motion Designer, Product Designer, Visual Designer, Illustrator, Web Developer, Frontend Developer, Full-Stack Developer)
2. Skills/tools they use (e.g., Figma, Adobe XD, Photoshop, Illustrator, After Effects, HTML/CSS, React, etc.)
3. Experience level (beginner: 0-1 years, intermediate: 1-3 years, advanced: 3-5 years, expert: 5+ years)
4. Available hours per week (10, 20, 30, or 40)
5. Portfolio URL (if they have one)
6. Their design niche or specialty (e.g., logo design, web design, mobile app design, branding, etc.)

Rules:
- Be friendly, warm, and conversational. You represent Prime Haven — a premium design agency.
- Ask ONE question at a time. Don't overwhelm them.
- Start by greeting them and asking what they do / their specialty.
- When you have enough info, confirm what you've gathered and ask if it's correct.
- When confirmed, respond with EXACTLY this format at the end of your message:

[PROFILE_DATA]
{
  "professional_title": "...",
  "skills": ["...", "..."],
  "experience_level": "beginner|intermediate|advanced|expert",
  "available_hours": 10|20|30|40,
  "portfolio_url": "..." or null,
  "niche": "..."
}
[/PROFILE_DATA]

- Only output the PROFILE_DATA block when the user confirms the gathered data is correct.
- Keep responses concise (2-3 sentences max per message).`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages, action, profile_data, user_id } = await req.json();

    // If action is "save", save the extracted profile data
    if (action === "save" && profile_data && user_id) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const updateData: any = {};
      if (profile_data.professional_title) updateData.professional_title = profile_data.professional_title;
      if (profile_data.skills?.length) updateData.skills = profile_data.skills;
      if (profile_data.experience_level) updateData.experience_level = profile_data.experience_level;
      if (profile_data.available_hours) updateData.available_hours = profile_data.available_hours;
      if (profile_data.portfolio_url) updateData.portfolio_url = profile_data.portfolio_url;
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from("designer_details")
        .update(updateData)
        .eq("user_id", user_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Otherwise, stream the AI chat
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
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    console.error("smart-onboarding error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
