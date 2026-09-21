# Talent Applicant Screening Funnel

A gated, self-serve hiring funnel that replaces manual interviews: apply → admin invite → intro video → randomized assessment → pass/fail → $15 registration payment → email verification → active professional with Discord invite.

## Assumptions (correct me if wrong)

- Pass mark: a fixed 70% score on the multiple-choice portion (a true "70th percentile" against other applicants would mean nobody can pass until a pool exists, and results would shift over time). The score is stored so you can still rank applicants.
- Questions per quiz: 15 by default, editable by you in settings. One timed attempt per applicant; a retake requires you to reset them.
- The practical task is stored for your manual review and does **not** affect the auto-score or the pass/fail routing.
- Applicants sign in with the email they applied with, using a one-time secure link sent on invite (no password until they reach the registration stage) — matching the existing token-link pattern used for project tracking.
- Existing pieces reused as-is: Paystack/Korapay checkout, the verification email function, and the Discord invite generator used after registration payment today.
- The existing `/register` page stays available; the new funnel becomes the recommended path for social-ad traffic.

## Stages and pages

```text
/apply                  public application form
  -> admin invites       (Applicants section in super-admin)
/applicant/:token       portal: video -> assessment -> result
  pass -> payment ($15) -> verification email -> /auth/confirm
  fail -> polite thank-you screen
verified -> /dashboard  + Discord invite instructions
```

1. **Intake** `/apply`: name, email, phone, role track (Graphic Design / Web Development / UI/UX Design), CV upload, portfolio upload or link. Rate-limited, validated with zod, duplicate email blocked.
2. **Portal** `/applicant/:token`: gated by token + status. Stage 1 shows the intro video (URL set by you); Continue unlocks only after playback reaches the end.
3. **Assessment**: randomized question set drawn from the applicant's track, mixed multiple-choice and short answer, plus the track's practical task (file upload or link/text). Auto-scores on submit, marks passed/failed, records the score.
4. **Payment**: passed applicants pay the flat $15 (GHS equivalent shown at the live rate) through the existing gateway; status becomes paid and a verification email goes out.
5. **Activation**: on verification the applicant becomes active, gains the professional role and profile, lands on their dashboard, and sees the Discord invite.
6. **Admin** `/superadmin/applicants`: table of name, track, status, score, payment status, date applied; filter by track/status, sort by score/date; row drawer with CV, portfolio, practical submission, invite/reset/reject actions. Plus a small settings panel for the intro video URL and questions-per-quiz.

## Technical notes

- **Tables** (all with RLS + GRANTs): `applicants` (contact, track, cv_url, portfolio_url/link, status enum-like text, access_token, score, answers_submitted_at, payment_reference, user_id); `assessment_questions` (track, type, prompt, options jsonb, correct_option, points, is_active); `applicant_assessments` (applicant_id, question_ids, answers jsonb, score, passed, practical_url/text, submitted_at); `assessment_tasks` (per-track practical brief).
- Public reads/writes never touch these tables directly. New edge functions do the work with the service role: `submit-application`, `invite-applicant`, `applicant-portal` (token → stage state), `start-assessment` (server picks and returns questions **without** answer keys), `submit-assessment` (server scores, sets status), `applicant-register` (after payment: create auth user, professional role + `designer_details`, trigger verification email).
- Storage: new private bucket `applicant-files` for CVs, portfolios, and practical uploads; admin views them through short-lived signed URLs (existing `get-signed-url` pattern).
- Payment reuses `verify-payment`/Paystack config; fee read from system settings so the $15 stays configurable.
- Front-end uses existing shadcn components, `Seo`, `checkRateLimit`, brand styling, and the admin layout/sidebar; new routes added to `App.tsx` with lazy loading. `/apply` indexable, portal routes noindex.
- Admin access guarded by the existing superadmin/masteradmin role checks.

## Build order

1. Migration for tables, policies, grants, plus seed questions (about 20 per track) and the three practical briefs.
2. Storage bucket + edge functions.
3. Public `/apply` page.
4. Applicant portal (video → assessment → result → payment → verification).
5. Admin Applicants section and settings.
6. End-to-end check with a browser pass through the whole funnel.
