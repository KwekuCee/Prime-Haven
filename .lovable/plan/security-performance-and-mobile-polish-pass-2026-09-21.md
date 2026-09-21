# Security, Performance, and Mobile Polish Pass

A staged hardening and polish pass across the whole Prime Haven platform, with security handled first and verified before broader UI changes.

## Current signals already checked

- The latest persisted security results currently show no active saved findings, but several scan results are stale and need a fresh run before calling the platform clean.
- The database linter currently reports SECURITY DEFINER functions callable by public or signed-in users. These need review because some are intentionally callable RPCs, while others may need execute access restricted.
- Dependency scanning could not complete because the workspace lockfile contains a workspace version format the scanner cannot parse. I will verify dependencies through the project package state instead of claiming dependency coverage from that failed scan.
- Database health is stable: database and pooler are up, memory and connections are low/healthy, disk usage is low.
- Slow-query signals point first to repeated salary-total RPC calls, repeated settings reads, and system log listing.

## Implementation order

1. **Security baseline and inventory**
   - Run a fresh backend security scan and inspect every table policy by table and role.
   - Inventory public forms, authenticated dashboards, Edge Functions, storage buckets, RPC functions, and third-party integrations.
   - Classify each access path by visitor, applicant, client, professional, superadmin, and masteradmin.
   - Produce changes only where the current code or policy confirms a real gap.

2. **Database and RLS hardening**
   - Tighten table policies where records can be read or changed by the wrong role.
   - Review SECURITY DEFINER functions and restrict execute access to only the roles that actually need each function.
   - Preserve required public flows such as applications, project tracking, support, newsletter, public portfolio, and service pages.
   - Keep admin and payment workflows working through server-side validation instead of broad client access.

3. **Edge Function and input validation hardening**
   - Add or standardize server-side schemas for public-facing and sensitive functions.
   - Validate payment references, applicant tokens, project tracking tokens, Discord inputs, email fields, phone fields, and upload metadata.
   - Enforce file upload limits by type, extension, size, and destination for CVs, portfolios, practical tasks, reference images, deliverables, and profile images.
   - Ensure public endpoints have rate limiting and return safe error messages.

4. **Secrets and third-party integration review**
   - Check whether payment, Discord, email, AI, and analytics keys are only used from server-side functions.
   - Remove any exposed secret-like values if found.
   - Keep publishable keys in client code only when they are meant to be public.
   - Confirm service-role usage is limited to Edge Functions that validate the caller or a secure token first.

5. **Performance pass**
   - Keep route-level lazy loading and add targeted lazy loading for heavy dashboard widgets, charts, editors, file previews, and admin-only panels.
   - Add `loading="lazy"`, async decoding, and stable dimensions to images where safe.
   - Reduce repeated settings and summary reads with caching or shared hooks.
   - Add targeted database indexes only if confirmed by slow-query plans.

6. **Mobile-first dashboard pass**
   - Review and polish the professional dashboard, marketplace, active contracts, submissions, payments, withdrawals, messaging, applicant portal, client dashboard, project review, chat, and admin queues on mobile widths first.
   - Convert wide tables into stacked cards or horizontal-safe layouts where needed.
   - Make primary actions thumb-friendly and ensure no text, controls, or cards overlap on small screens.
   - Keep desktop layouts intact after the mobile work.

7. **Animation and polish**
   - Use existing Framer Motion dependency for subtle, fast transitions.
   - Add shared motion wrappers for page entry, cards, modals, and key action feedback.
   - Respect reduced-motion preferences and avoid heavy animation on mobile.
   - Keep the Prime Haven look: clean, sharp, fast, and not decorative for its own sake.

8. **Verification**
   - Re-run security scan and database linter after security changes.
   - Check build status and relevant runtime logs.
   - Browser-test representative mobile and desktop flows: applicant portal, marketplace/contract flow, payments, messaging, client approval, and admin queues.
   - Report any remaining risks that require external credentials, manual third-party dashboard setup, or product decisions.

## Technical notes

- I will not weaken payment/auth behavior to simplify the UI.
- I will not remove legitimate public features while fixing access rules.
- I will use migrations for policy/function/index changes and source edits for app/Edge Function changes.
- If a security fix would noticeably change user behavior, I will stop and ask with concrete options before applying it.
