# Marketplace, Client Accounts & 70% Revenue Split

## 1. Flat 70% revenue share for every profession

- Every job pays the professional who claimed and completed it **70% of that job's price**; Prime Haven keeps 30%.
- The per-profession difference (pool share vs. web-dev commission) is removed. One rule for Graphic Design, UI/UX, Web Dev, SMM and any future profession.
- `client_projects` gains a stored job price (currently only a free-text `budget` field exists), so earnings can be calculated exactly instead of estimated from points.
- The revenue share setting in the superadmin Settings tab is set to 70 and used everywhere (designer dashboard, expected-earnings modal, Finance Hub, monthly reports) instead of the hardcoded 50/60 fallbacks.

## 2. Prime Haven approval removed

- Completion path becomes: **claimed -> in progress -> submitted -> client approves -> completed**. There is no PH approval step in between; the client's approval alone completes the job, awards points and unlocks the 70% earnings.
- Admins keep a **view + emergency override**: they can see every submission and can reject/revoke abusive or spam work, but they cannot approve it on the client's behalf.
- Existing submissions stuck at "awaiting Prime Haven approval" are moved forward to "awaiting client approval" so nothing is orphaned.
- The QA / category admin dashboards switch from approve/reject controls to monitoring plus the override action.

## 3. Client accounts at checkout

- The order form collects the client's email + password and creates a real client account at checkout (this already happens on the free-promo path; it will be applied to the paid path too, after payment confirms).
- New accounts created this way get a **client** role, not a designer role, so they land on the client dashboard and are never counted as talent or shown on leaderboards.
- The client dashboard becomes the single home for their projects: status, milestones, deliverables, approve/request-revision, and chat.

## 4. Payment confirms the project

- A project only becomes real once payment is confirmed. Unpaid/abandoned checkouts do not create a marketplace listing.
- On confirmed payment: the client account is created, the project record is written with the paid amount, and only then is it published to the marketplace on the professionals' dashboards.
- Professionals see it in the marketplace filtered to their profession, claim it, and start work.

## 5. First-come-first-served claiming, one at a time

- **One professional per job.** The first claim wins; the listing disappears for everyone else immediately (realtime).
- **One active job per professional.** Until they submit the work, they cannot claim anything else. Superadmin/masteradmin keep their existing audited bypass.
- Points and the 70% value are **not** credited on claim or submission — only when the client approves. Until then the dashboard shows the job as "pending client approval" with the pending value greyed out.
- Once claimed, a private chat opens between that client and that professional (both directions, realtime), visible in the client dashboard and the professional's project workspace.
- If the job deadline passes with no submission, the claim is **auto-released** and the job returns to the marketplace.

## Technical notes

Database (single migration):
- `app_role` gains `client`; `handle_new_user` reads a signup flag and assigns `client` (no designer_details/leaderboard row) instead of defaulting everyone to `designer`.
- `client_projects`: add `price_ghs numeric`, `price_usd numeric`, `paid_at`, `claimed_by`, `claimed_at`; force `max_assignees = 1`.
- `system_settings`: `revenue_share_percentage` -> 70; add `designer_share_percentage` alias usage removed in favour of one key.
- `claim_project` rewritten: `SELECT ... FOR UPDATE` on the project row for true first-come-first-served, reject if any claim exists, reject if the caller has any assignment in `claimed/in_progress/submitted-awaiting-client`, drop the `ph_approved` condition, stamp `claimed_by`.
- New `approve_project_submission(p_submission_id)` (security definer, client-only): sets `client_accepted`, `status = 'approved'`, awards points, records the 70% earning row, frees the professional.
- New `release_expired_project_claims()` + pg_cron schedule: releases claims whose project deadline has passed with no submission.
- `guard_submissions_workflow` / `release_designer_on_ph_approval` updated to drop the ph_approved gate; admin override path retained.
- `project_chat_messages` policies scoped to the project's client and its current claimant; realtime enabled.

Frontend:
- `StartProject.tsx` / `ClientStartProject.tsx`: password field on the paid path, project creation moved behind payment confirmation with the paid amount stored.
- `ProjectMarketplace.tsx`: single-claimer messaging, realtime removal of claimed jobs.
- `SubmitWork.tsx`, `ProjectWorkspace.tsx`: submit -> "awaiting client approval", chat panel with the client.
- `ClientDashboard.tsx`: approve / request revision, chat with the assigned professional.
- `Dashboard.tsx`, `ExpectedSalaryModal.tsx`, `Payments.tsx`, `WithdrawCard.tsx`, `FinanceDashboard.tsx`, `MonthlyReports.tsx`: 70% math, pending-vs-earned separation.
- `QADashboard.tsx` + category admin dashboards: remove approve, keep view + override.
