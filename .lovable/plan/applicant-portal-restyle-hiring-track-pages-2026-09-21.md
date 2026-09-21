# Applicant portal restyle + Hiring Track pages

Two pieces of work: give the applicant screening portal the same look and structure as the admin dashboard (with content that changes per track), and add a proper page for every service on the homepage with rates and a "hire us directly" form.

## What I checked first

- The homepage services list shows eight services and currently does not link anywhere — the cards are plain text with no destination.
- There is an old `/services/:slug` page, but its content is hardcoded and only covers four services, so Motion Graphics, Video Editing, Social Media Management and Mobile App Development lead to a "Service Not Found" screen.
- Your pricing table already holds live tiered prices (basic / standard / premium) for logo, brand identity, flyers, print, social media, banners, brochures, book covers, web design, app & UI/UX, mobile app development, motion graphics and video editing. The track pages will read these, so editing a price in the admin pricing screen updates the public pages instantly.
- The applicant portal exists and works, but it is a plain centered card stack, unrelated to the admin dashboard styling.

## 1. Applicant portal, dashboard style

Rebuild the portal shell to match the admin dashboard: a fixed side rail with the Prime Haven mark, the applicant's name, their track, and the stage list (Intro video, Assessment, Practical task, Registration, Activation) with each stage showing done / current / locked. The main area keeps the existing stage screens but restyled into the same cards, headers and stat tiles used across the admin screens, with the same spacing rules. On phones the rail collapses into a horizontal progress strip.

Per-track content on the dashboard:

- Track name, icon and colour accent pulled from the shared service list
- A "your track" panel: what the practical task will be, how many questions, the pass mark, and what the track does at Prime Haven
- Social Media Management shows a "quiz only, no practical task" note instead of the practical panel
- After passing, a track-specific "what happens next" panel naming the Discord channel their work will come through

No change to the screening rules, scoring, copy detection or payment flow.

## 2. Hiring Track pages

One page per service at `/services/<slug>`, replacing the stale hardcoded page, so all eight work:

- Hero with the service name, summary and image
- What's included and how we work (from the shared service list)
- Rates: live tier cards from your pricing table for every package belonging to that service, in USD with the Ghana cedi equivalent at the live rate
- Direct hire request form: name, email, WhatsApp, package/tier, budget, deadline, brief, optional reference images
- Secondary CTA for that track's professionals: "Apply to join this track" linking to the application form (shown on the six hiring tracks)

Submitting the form saves the request for you and emails you a notification; the visitor gets a confirmation screen with the option to pay straight away through the existing Start a Project checkout. Requests appear in a new "Hire requests" section of the admin dashboard where you can see, filter and mark them as contacted, converted or closed.

Homepage services cards become links to their track page, with a visible "View track" affordance. Each track page gets its own search title, description and service structured data, and all eight are added to the sitemap.

## Technical notes

- New table `public.hire_requests` (name, email, whatsapp, service slug, tier, budget, deadline, brief, reference image paths, status, created_at/updated_at) with RLS: no direct public writes; admins read and update; a new `submit-hire-request` edge function writes with the service role, validates with zod, and is rate limited through the existing `check_rate_limit` RPC (action `hire_request`, 3/hour). GRANTs for authenticated and service_role only.
- Reference images reuse the existing `client-order-attachments` bucket.
- `ServiceDetail.tsx` rewritten to source everything from `CORE_SERVICES` plus a `service_pricing` query keyed on `discord_category`/`service_type`; the hardcoded `serviceDetails` object is deleted.
- Pricing currency conversion uses the existing `getUsdToGhsRate` helper (15.5 fallback).
- Portal restyle is presentation only: `ApplicantPortal.tsx` plus a new `ApplicantPortalShell` and `TrackPanel`, reading track metadata from `talentTracks.ts`/`coreServices.ts`. Edge functions unchanged.
- Admin "Hire requests" screen added under `/superadmin/hire-requests` using the existing admin layout, table and filter patterns.

## Note on "six tracks"

The homepage lists eight services. I'll build a page for all eight so no card leads to a dead end, and treat the six hiring tracks (Graphic Design, UI/UX Design, Mobile App Development, Motion Graphics, Video Editing, Social Media Management) as the ones that also show the "apply to join" call to action. Say the word if you'd rather only six get pages.
