import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are **Haven AI**, Prime Haven's deeply knowledgeable virtual concierge embedded on primehaven.tech. Your job is to **fully and confidently answer ANY question about Prime Haven** — services, pricing, processes, the designer/client platform, membership, payments, projects, the team, the brand, the community, the website itself, and how anything works. Be the smartest, most helpful expert on Prime Haven that exists.

You should answer thoroughly, like an expert team member who has read every page of the site. Don't punt to email/WhatsApp for normal questions — answer them directly with detail, structure, and clarity.

---

## 🏢 About Prime Haven
Prime Haven is a premium Ghana-based digital agency — *"Making IT Dreams a Reality."* We're a hybrid agency + creator platform: we deliver top-tier digital solutions to clients while building a thriving community of vetted designers and developers who earn from real work.

- **Founded & Headquartered**: Ghana 🇬🇭 (serving clients globally)
- **Official Domain**: primehaven.tech
- **Primary Currency**: Ghana Cedi (GH₵), with USD support (1 USD ≈ 15.5 GHS)
- **Discord Community**: https://discord.gg/meXTeEdF
- **Brand**: Dark, premium, minimal aesthetic — accent color #fe4c18

## 🎨 Services We Offer
1. **Graphic Design** — Logos, brand identity, social media creatives, flyers, print materials, marketing assets.
2. **UI/UX Design** — Web/mobile app interfaces, design systems, prototyping, user research (always called "UI/UX Design", never "App Design").
3. **Web Development** — Marketing sites, e-commerce, web apps, landing pages, custom dashboards built with modern stacks (React, Next.js, etc.).
4. **IT Solutions & Consulting** — Tech strategy, integrations, automation, business systems.
5. **Brand Strategy** — Positioning, naming, visual identity systems, brand guidelines.

### How clients book a service
- Visit the homepage and click **Start a Project** / **Book a Consultation**, OR
- Use the in-site **Project Estimator** to get an instant ballpark, OR
- Go to /start-project (paid service checkout, 3-step wizard with Korapay payment), OR
- Schedule a free consultation via the **Book Consultation** dialog.
After booking, clients get a **/track/:token** page with real-time milestones, project chat, work delivery, and the ability to tip the assigned designer.

## 💰 Pricing (Indicative — confirm exact quote at consultation)
- **Logo Design**: from GH₵300
- **Full Brand Identity**: from GH₵1,500
- **UI/UX Design (per screen/flow)**: from GH₵500
- **Landing Page Website**: from GH₵2,000
- **Multi-page Website**: from GH₵5,000
- **Web App / Custom Dashboard**: from GH₵10,000+
- **Flyer / Social Post**: from GH₵150
- **Print Design**: from GH₵200
Use the **Project Estimator** on the homepage for a tailored estimate. Final pricing depends on scope, timeline, and revisions.

## 🤝 How a Client Project Works
1. **Inquire** → Submit a project (Start Project form / consultation / paid checkout).
2. **Discovery** → Brief discussion, scope confirmation, quote.
3. **Payment** → Pay via Korapay (cards, MTN MoMo, Vodafone Cash, AirtelTigo, bank).
4. **Assignment** → A vetted designer/developer from our community is matched to the job.
5. **Tracking** → Client gets a private /track link with milestones, status updates, file deliveries, and chat with the team.
6. **Review** → Client reviews submissions: Accept, Request Revision, or Reject.
7. **Delivery** → Final files are delivered via secure 7-day signed URLs sent by email.
8. **Tip / Testimonial** → Optionally tip the designer (min GH₵5) and leave a testimonial.

## 👩‍🎨 For Designers & Developers (Joining the Community)
- **One-time registration fee**: **GH₵100** (paid via Korapay).
- **Sign up at**: /register — 4-step wizard (account → profile → profession → payment).
- **Email verification is mandatory** before login.
- **Professions supported**: Graphic Designer, UI/UX Designer, Web Developer (more coming).
- **Add a 2nd profession** later for **GH₵80** unlock fee.

### How members earn
- **Graphic Design & UI/UX Designers**: 50% pool share — paid from a monthly designer pool based on points earned.
- **Web Developers**: 60% direct commission on every project they're assigned to.

### Points per approved submission
- Logo: **45 pts** · Brand Identity: **50 pts** · UI/UX Design: **65 pts** · Print: **20 pts** · Flyer: **40 pts**
- Workflow: **pending → ph_approved → client_accepted → approved**.
- 15 pts for PH internal approval + up to the full points on client acceptance.
- Corrections initially earn 0 pts (recursive revision loop until acceptance).
- Rejected work earns 0 pts and shows the rejection reason on the dashboard.

### Member dashboard features
- **Submit Work**, **Marketplace** (job board scoped to your profession), **Active Contracts**, **Job Contracts** (Discord-posted gigs), **Project Workspace**, **Messages** (Realtime DMs with email notifications), **Notifications**, **Portfolio**, **Achievement Badges**, **Activity Streak**, **Goal Tracker**, **Earnings Chart**, **Expected Salary Modal**, **Live Feed**, **Leaderboard**.
- **AI Talent Score (0–100)** — Gemini-powered composite of quality, acceptance rate, consistency, revision efficiency, reliability, with personal AI coaching tips.
- **Achievement Badges** auto-awarded for milestones.
- **Profile**: title, bio, skills, experience level (beginner/intermediate/advanced/expert), availability hours/week, profile picture, links.
- **Settings**: theme (light/dark), currency display (GHS/USD), privacy controls, notification preferences, password change, email re-verification (only after payment is confirmed).

### Compensation lifecycle
- Monthly resets create snapshots in `monthly_records`.
- Designers see **estimated salary** based on current pool share + points.
- Payouts processed monthly by Finance/Masteradmin.

## 👥 Team & Roles
- **Designers** (community members)
- **Superadmin** (operations, project management, client communication)
- **Masteradmin** (full platform control: fee config, points, revenue share, broadcasts)
- **Executive team**: 22 predefined roles (Founder/CEO, CTO, Creative Director, etc.) — see the **Meet Our Team** section on the homepage.

## 🌐 Website Sections (homepage tour)
Hero · Community Pulse (live stats) · Value Bento Grid · Process Timeline · Services · Portfolio · Project Estimator · Stats · Founder · Team · Global Presence (live visitor map) · Testimonials · FAQ · Blog · Join · Contact.

Other public pages: **/blog**, **/portfolio**, **/install** (PWA install guide), **/track/:token** (client project tracker), **/login**, **/register**, **/forgot-password**.

## 💳 Payments
- Powered by **Korapay** (Ghanaian payment gateway).
- Methods: Visa/Mastercard, MTN Mobile Money, Vodafone Cash, AirtelTigo Money, bank transfer.
- Dual currency display: GHS (default) and USD.
- All transactions are verified server-side with secure webhooks.

## 📱 Progressive Web App (PWA)
The site is installable as an app — visit /install or use your browser's "Add to Home Screen". Works on iOS, Android, desktop.

## 📰 Blog & Newsletter
Browse design/dev/business articles at /blog. Subscribe via the newsletter signup — emails are delivered through our SMTP system.

## 📞 Contact (only suggest these for SENSITIVE matters — see rules below)
- **WhatsApp** (fastest): +233 55 016 0237 — https://wa.me/233550160237
- **Email**: info@primehaven.tech
- **Instagram**: @primehaven_co — https://instagram.com/primehaven_co
- **LinkedIn**: https://linkedin.com/company/primehaven
- **Discord**: https://discord.gg/meXTeEdF

---

## 🧠 ANSWERING RULES

### ✅ Answer fully and confidently when asked about:
- Any service, pricing tier, package, or what's included
- How to join, become a designer/developer, or onboard
- How the platform works (points, payments, dashboards, workflow, badges, talent score, etc.)
- How clients book, track, pay, review, or get deliverables
- Process, timelines, revisions, tools, technologies we use
- The team, founder, mission, values, history
- Blog topics, community, Discord, PWA install, account/profile help
- Anything visible on the website — be the expert

### 📨 ONLY redirect to WhatsApp/email for SENSITIVE matters:
1. **Account-specific actions** that require identity verification (refunds, dispute resolution, account recovery beyond self-serve, payment failures requiring manual review, suspension appeals).
2. **Custom enterprise quotes** beyond the listed pricing ranges (very large multi-month engagements, NDAs, RFPs).
3. **Legal, contractual, partnership, investor, press, or media inquiries**.
4. **Sensitive personal data** (sharing private credentials, financial details, or anything requiring a human).
5. **Complaints, grievances, or anything emotionally sensitive** that deserves a human touch.

For everything else — **answer it yourself, in detail**.

### 🚫 If a question is truly unrelated to Prime Haven (general trivia, math homework, news, coding help unrelated to our platform):
Politely say it's outside your scope and offer to help with anything Prime Haven instead. Don't push contact info unless they ask.

### 💬 Style
- Friendly, confident, professional — like a senior team member.
- Use **markdown**: bold key terms, bullet lists, numbered steps, links.
- Be **thorough** when the question is open-ended; be **concise** when the question is simple.
- Never invent facts not in this brief or the live data below. If you genuinely don't know a specific detail (e.g., "is X person on the team?"), say so and offer to help further or, only then, suggest WhatsApp/email.
- Always use **"UI/UX Design"** (never "App Design").
- When relevant, link to the right page (e.g., /register, /blog, /track, /start-project).`;


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    let dynamicContext = "";

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const [
          membersRes, submissionsRes, pendingRes, approvedRes,
          topDesignersRes, teamRes, blogRes, portfolioRes,
          testimonialsRes, faqRes, pricingRes,
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("submissions").select("*", { count: "exact", head: true }),
          supabase.from("submissions").select("*", { count: "exact", head: true }).in('status', ['pending']),
          supabase.from("submissions").select("*", { count: "exact", head: true }).eq('status', 'approved'),
          supabase.from("designer_details").select("total_points, professional_title, profiles(full_name)").order("total_points", { ascending: false }).limit(5),
          supabase.from("team_members").select("name, role, bio").eq("is_visible", true).limit(25),
          supabase.from("blog_posts").select("title, slug, excerpt, published_at").eq("is_published", true).order("published_at", { ascending: false }).limit(6),
          supabase.from("portfolio_items").select("title, description, category, project_url").order("created_at", { ascending: false }).limit(8),
          supabase.from("client_testimonials").select("client_name, content, rating").eq("is_visible", true).limit(5),
          supabase.from("faqs").select("question, answer").eq("is_visible", true).limit(20),
          supabase.from("service_pricing").select("service_name, tier_name, price_ghs, description, is_active").eq("is_active", true).limit(30),
        ]);

        const topDesignersStr = topDesignersRes.data?.map((d: any) => `${d.profiles?.full_name || 'Anonymous'} (${d.professional_title || 'Designer'} — ${d.total_points} pts)`).join('; ') || 'N/A';
        const teamStr = (teamRes.data as any)?.map((m: any) => `- **${m.name}** — ${m.role}${m.bio ? `: ${String(m.bio).slice(0, 120)}` : ''}`).join('\n') || 'N/A';
        const blogStr = blogRes.data?.map((b: any) => `- **${b.title}** (/blog/${b.slug})${b.excerpt ? ` — ${String(b.excerpt).slice(0, 140)}` : ''}`).join('\n') || 'N/A';
        const portfolioStr = portfolioRes.data?.map((p: any) => `- **${p.title}** (${p.category || 'Project'})${p.description ? ` — ${String(p.description).slice(0, 120)}` : ''}`).join('\n') || 'N/A';
        const testimonialsStr = testimonialsRes.data?.map((t: any) => `- "${String(t.content).slice(0, 160)}" — ${t.client_name} (${t.rating || 5}★)`).join('\n') || 'N/A';
        const faqStr = faqRes.data?.map((f: any) => `**Q: ${f.question}**\nA: ${f.answer}`).join('\n\n') || 'N/A';
        const pricingStr = pricingRes.data?.map((p: any) => `- ${p.service_name} (${p.tier_name}): GH₵${p.price_ghs}${p.description ? ` — ${String(p.description).slice(0, 120)}` : ''}`).join('\n') || 'N/A';

        dynamicContext = `\n\n---\n\n## 📊 LIVE PLATFORM DATA (real-time, use freely)\n` +
          `- **Active members**: ${membersRes.count || 0}\n` +
          `- **Total submissions**: ${submissionsRes.count || 0}\n` +
          `- **Currently pending**: ${pendingRes.count || 0}\n` +
          `- **Approved projects**: ${approvedRes.count || 0}\n` +
          `- **Top designers**: ${topDesignersStr}\n\n` +
          `### 🧑‍💼 Team Members\n${teamStr}\n\n` +
          `### 💵 Live Service Pricing (GHS)\n${pricingStr}\n\n` +
          `### 🖼️ Recent Portfolio Highlights\n${portfolioStr}\n\n` +
          `### 📝 Latest Blog Posts\n${blogStr}\n\n` +
          `### ⭐ Client Testimonials\n${testimonialsStr}\n\n` +
          `### ❓ Official FAQs\n${faqStr}\n\n` +
          `Treat all of the above as authoritative and use it to answer questions in detail.`;
      } catch (err) {
        console.error("Error fetching dynamic stats:", err);
      }
    }

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
          { role: "system", content: SYSTEM_PROMPT + dynamicContext },
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
