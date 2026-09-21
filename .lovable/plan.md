# Hiring Funnel Landing Pages

Build public landing pages for all eight hiring tracks before visitors reach the application form. Each page will explain the track, who should apply, the screening process, and the one-time joining fee only.

## Scope

- Create one reusable landing-page experience for the eight current hiring tracks:
  - Graphic Design
  - UI/UX Design
  - Web Development
  - Mobile App Development
  - Motion Graphics
  - Video Editing
  - Social Media Management
  - General IT Solutions
- Keep the track list connected to the existing shared services source so homepage services, apply options, and hiring pages stay aligned.
- Show only the joining fee: $15 USD with Ghana conversion support if the existing rate helper is available.
- Do not show service/project package prices on these hiring pages.
- Keep Social Media Management accurate by explaining that it skips the practical-task stage.

## Visitor flow

```text
Homepage Services
  -> Hiring track landing page
  -> Apply form with the selected track prefilled
  -> Applicant portal after admin invite
```

## Page content

Each hiring track page will include:

1. Track-specific headline, service summary, and suitable applicant profile.
2. What applicants should be able to do for that track.
3. Screening steps: application, admin review, intro video, quiz, practical task where applicable, pass result, $15 joining fee, verification, dashboard access.
4. Clear joining-fee card showing the one-time $15 registration fee, not client project costs.
5. Direct “Apply for this track” action that opens the existing application page with the chosen track preselected.
6. SEO metadata for each track page.

## Application page update

- Allow `/apply?track=...` to preselect the relevant track.
- Keep the normal track dropdown editable so applicants can change tracks before submitting.
- Preserve the existing upload, validation, and rate-limiting behavior.

## Homepage update

- Update service cards so visitors can enter the hiring funnel page for that track.
- Keep the existing service pages untouched unless a link needs to point to the new hiring funnel.

## Technical notes

- Add a route like `/hiring/:trackSlug` for the new pages.
- Reuse existing shared service data from `CORE_SERVICES` and existing hiring-track helpers.
- Add small helper copy/data only for applicant-facing requirements per track; do not create backend tables for this.
- Use existing Prime Haven light styling, shadcn buttons/forms, `Seo`, and responsive layout patterns.
- No Discord, payment, applicant scoring, or admin workflow changes are included in this pass.

## Verification

- Check that all eight `/hiring/...` pages render.
- Check that each “Apply” action preselects the correct track on `/apply`.
- Check that Social Media Management does not mention a practical task requirement.
- Check that no client service/project prices appear on the hiring pages.
