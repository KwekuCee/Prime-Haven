# App Improvement Phases (from whole-app review)
- [x] Phase 1: Backend functions only accept requests from Prime Haven sites (shared origin check, deployed)
- [x] Phase 2: Protect all admin pages at one central point (AdminRoute wraps every /superadmin page)
- [x] Phase 3: Merge the three department admin dashboards into one (DepartmentAdminDashboard + config)
- [~] Phase 4: Shared data cache in place (lib/queryClient + cached system settings on 4 dashboards); remaining pages to migrate incrementally
- [x] Phase 5: Screening funnel chart on admin Applicants page (built from existing screening timestamps)
- [x] Phase 6: UI cleanup — shared dark-surface colours, icon-button labels, dead theme-switching code removed (site is light-only); remaining "Loading…" texts are inside dropdowns, skeletons already cover dashboards
- [x] Phase 7: Architecture — verified money logic is typed and centralised (lib/revenue, clientRevenue, platformRevenue), backend functions share _shared helpers (cors, resend, applicants, jobContract), jsPDF and charts load only on demand/lazy routes
- [x] Phase 8: Features — request-changes history, payout reconciliation, unified activity log (price estimator skipped by user)
- Known pre-existing bug: seed-admin function has a duplicate variable and won't deploy

# Security, Performance, and Mobile Polish Pass

## Current request
- [x] Earth-horizon hero with homepage content scrolling over it and a fixed rounded navbar
- [x] Brand every outgoing email, remove PH-approval wording, and route senders by purpose
- [x] Alert primehaven26@gmail.com on site submissions
- [x] Send web/app development inquiries to consultation instead of fixed-price checkout
- [x] Fix sticky/stuck scrolling on the homepage and verify it on mobile and desktop

- [ ] Security baseline and inventory: fresh scan, table policy review, function/access-path inventory
- [ ] Database and RLS hardening: tighten gaps, review SECURITY DEFINER execute access
- [ ] Edge Function and input validation hardening: schemas, uploads, payments, public form limits
- [ ] Secrets and third-party integration review: payment, Discord, email, AI, analytics, service-role usage
- [ ] Performance pass: lazy loading, image loading, repeated settings/summary reads, slow-query indexes
- [ ] Mobile-first dashboard pass: professional, client, applicant, admin, marketplace, messaging, payments
- [ ] Animation and polish: subtle Framer Motion transitions and shared wrappers
- [ ] Verification: security scan/linter, build logs, browser checks across mobile and desktop flows
- [x] Phase 6 (part): screen-reader labels on all icon-only buttons
- [x] Phase 6 (part): shared dark-surface colours for navbar, Join/Blog sections, Superadmin
