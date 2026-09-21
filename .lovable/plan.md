# Talent Screening — Refinements

## Assumption to confirm
You listed six hiring tracks (Graphic Design, UI/UX Design, App Development, Video Editing, Motion Graphics, Social Media Management). The homepage services list actually has eight — it also includes **Web Development** and **General IT Solutions**. I will use exactly your six as the hiring tracks, and keep Web Development/IT Solutions as services you sell but don't recruit for. Say the word if you want those two added as tracks too.

## 1. Service tracks
- Add one shared track list next to the existing services list, so the apply page, admin filters, question banks and Discord mapping all read the same source and can never drift.
- Existing applicants already on "Web Development" keep their record and stay filterable; the option simply no longer appears for new applicants.
- Question banks and practical briefs for the three new tracks (App Development, Video Editing, Motion Graphics) plus Social Media Management get seeded — 20 questions per track, same style as the existing ones. Existing Graphic Design and UI/UX banks are untouched.

## 2. Practical tasks
- Every track keeps a practical exercise except Social Media Management, which goes quiz → score directly. The portal hides the upload/link step for that track and the server stops requiring it.

## 3. Applicant emails
- **Invite email:** adds a line telling them the assessment includes a short practical exercise for their track (omitted for Social Media Management).
- **Result email:** sent right after scoring — their score, the pass mark, and either the next step (registration fee) or a polite close.

## 4. Anti-cheating
- Copying text on the assessment page is detected. First copy shows a clear on-screen warning that a second one ends the attempt.
- Second copy calls the server, which marks the applicant failed and closes the attempt permanently — a page refresh can't undo it. The client only reports the event; the decision and the record are server-side.

## 5. Admin delete
- Each applicant row gets a Delete action behind a typed confirmation dialog, removing the applicant, their assessment attempts, and their uploaded files.

## 6. UI consistency pass
- Review and align the screening pages (apply form, applicant portal, admin Applicants) plus the admin shell around them: consistent card padding, heading sizes, table density, button sizes, empty/loading states, and mobile stacking, all using existing design tokens. No new visual language.

## 7. Discord routing — I need channel IDs from you
Today only three channels are mapped (Graphic Design, UI/UX, Web Development) and everything else falls through. I'll add named config for every track. **Please send the Discord channel ID for each:** App Development, Video Editing, Motion Graphics, Social Media Management. I'll leave them blank until you do — no placeholder IDs — and postings for those tracks will keep using the current fallback until filled.

## 8. Verification answers
Answered in my reply, with the exact place in the flow each step fires.

## Technical notes
- New shared module `TALENT_TRACKS` derived from `coreServices.ts`; mirrored in `supabase/functions/_shared/applicants.ts` (`TRACKS`).
- Migration: seed `assessment_questions` + `assessment_tasks` for the four new tracks; add `applicants.integrity_flags` (int) and `integrity_status` (text) for copy-event tracking; delete cascade already exists on `applicant_assessments`.
- `submit-assessment`: practical required only when the track has an active task; sends the result email via the existing SMTP helper.
- New edge function `applicant-integrity` (token-gated, verify_jwt=false): increments the copy counter, and on the second event sets `status='failed'`, closes the open attempt, and returns a terminal response.
- `invite-applicant`: practical heads-up line conditional on track.
- `post-job-contract`: `DISCORD_CHANNELS` expanded to all tracks with empty values pending your IDs, plus matching `CATEGORY_SKILLS`/labels.
- `ManageApplicants.tsx`: delete via a new admin-only `delete-applicant` edge function (service role, removes storage objects too).
