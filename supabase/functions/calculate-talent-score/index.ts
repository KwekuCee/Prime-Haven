import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { designer_id } = await req.json();

    // If no specific designer, recalculate all
    const designerIds: string[] = [];
    if (designer_id) {
      designerIds.push(designer_id);
    } else {
      const { data: allDesigners } = await supabase
        .from("designer_details")
        .select("user_id");
      if (allDesigners) {
        designerIds.push(...allDesigners.map((d: any) => d.user_id));
      }
    }

    const results: any[] = [];

    for (const uid of designerIds) {
      // Fetch all submissions for this designer
      const { data: submissions } = await supabase
        .from("submissions")
        .select("*")
        .eq("designer_id", uid)
        .order("created_at", { ascending: false });

      const subs = submissions || [];
      const totalSubs = subs.length;

      if (totalSubs === 0) {
        // No submissions = base score
        const breakdown = {
          quality: 0,
          acceptance_rate: 0,
          consistency: 0,
          revision_efficiency: 100,
          reliability: 50,
          ai_insight: "No submissions yet. Start submitting work to build your talent score!"
        };
        await supabase
          .from("designer_details")
          .update({
            talent_score: 10,
            talent_score_breakdown: breakdown,
            talent_score_updated_at: new Date().toISOString(),
          })
          .eq("user_id", uid);
        results.push({ user_id: uid, score: 10 });
        continue;
      }

      // Calculate metrics
      const approvedSubs = subs.filter((s: any) => s.ph_approved || s.status === "approved");
      const clientAccepted = subs.filter((s: any) => s.client_accepted);
      const rejectedSubs = subs.filter((s: any) => s.status === "rejected" || s.status === "client_rejected");
      const totalRevisions = subs.reduce((sum: number, s: any) => sum + (s.revisions_count || 0), 0);
      const avgRevisions = totalSubs > 0 ? totalRevisions / totalSubs : 0;

      // Quality (0-100): based on points earned relative to max possible
      const servicePointsMap: Record<string, number> = { logo: 45, branding: 50, uiux: 65, web: 65, print: 20, flyer: 30 };
      const totalPoints = subs.reduce((sum: number, s: any) => sum + (s.points_awarded || 0), 0);
      const maxPossiblePoints = subs.reduce((sum: number, s: any) => sum + 15 + (servicePointsMap[s.service_type] || 40), 0);
      const quality = maxPossiblePoints > 0 ? Math.min(100, (totalPoints / maxPossiblePoints) * 100) : 0;

      // Acceptance rate (0-100)
      const acceptance_rate = totalSubs > 0 ? ((clientAccepted.length + approvedSubs.length) / (totalSubs * 2)) * 100 : 0;

      // Consistency (0-100): based on submission frequency (submissions per month)
      const firstSub = new Date(subs[subs.length - 1]?.created_at);
      const now = new Date();
      const monthsActive = Math.max(1, (now.getTime() - firstSub.getTime()) / (1000 * 60 * 60 * 24 * 30));
      const subsPerMonth = totalSubs / monthsActive;
      const consistency = Math.min(100, subsPerMonth * 20); // 5+ subs/month = 100

      // Revision efficiency (0-100): fewer revisions = better
      const revision_efficiency = Math.max(0, 100 - (avgRevisions * 25));

      // Reliability (0-100): rejection rate inverse
      const rejectionRate = totalSubs > 0 ? rejectedSubs.length / totalSubs : 0;
      const reliability = Math.max(0, 100 - (rejectionRate * 100));

      // Weighted composite score
      const compositeScore = Math.round(
        quality * 0.30 +
        acceptance_rate * 0.25 +
        consistency * 0.15 +
        revision_efficiency * 0.15 +
        reliability * 0.15
      );

      const finalScore = Math.max(0, Math.min(100, compositeScore));

      // Get AI insight
      let aiInsight = "";
      try {
        const prompt = `You are a talent evaluator for a design agency called Prime Haven. Analyze this designer's metrics and give a brief 1-2 sentence performance insight and recommendation. Be encouraging but honest.

Metrics:
- Total submissions: ${totalSubs}
- Quality score: ${quality.toFixed(1)}%
- Client acceptance rate: ${acceptance_rate.toFixed(1)}%
- Consistency (submissions/month): ${subsPerMonth.toFixed(1)}
- Average revisions per project: ${avgRevisions.toFixed(1)}
- Rejection rate: ${(rejectionRate * 100).toFixed(1)}%
- Overall talent score: ${finalScore}/100

Give a concise, actionable insight.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a talent performance analyst. Keep responses under 2 sentences." },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiInsight = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (aiErr) {
        console.error("AI insight error:", aiErr);
        aiInsight = "Keep up the good work and focus on quality submissions!";
      }

      const breakdown = {
        quality: Math.round(quality),
        acceptance_rate: Math.round(acceptance_rate),
        consistency: Math.round(consistency),
        revision_efficiency: Math.round(revision_efficiency),
        reliability: Math.round(reliability),
        total_submissions: totalSubs,
        ai_insight: aiInsight,
      };

      await supabase
        .from("designer_details")
        .update({
          talent_score: finalScore,
          talent_score_breakdown: breakdown,
          talent_score_updated_at: new Date().toISOString(),
        })
        .eq("user_id", uid);

      results.push({ user_id: uid, score: finalScore });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("calculate-talent-score error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
