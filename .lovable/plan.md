## 1. Optional client reference images on order

**Storage**
- Create a public bucket `client-order-attachments` (attachments are referenced from Discord posts, admin dashboards and designer job cards, so public URLs are simplest).
- Policies: authenticated + anon can INSERT into a `orders/` prefix; anyone can SELECT.

**Schema**
- Add `reference_images text[]` (nullable, default `'{}'`) to `client_orders` and to `client_projects` so the reference images travel with the tracked project a designer eventually claims.

**UI (both `StartProject.tsx` and `ClientStartProject.tsx`)**
- New optional "Reference images (optional)" file input in the details step, accepts images ≤ 5 MB each, up to 5 files.
- On submit, upload each to `client-order-attachments/orders/{reference}/{filename}` and pass the resulting public URLs into the `client_orders` insert, the `client_projects` insert, and the `process-client-order` edge function payload (`referenceImages: string[]`).
- Also include the URLs in the Discord embed via the existing `notify_discord_order` path — pass them as a new optional `p_reference_images text[]` argument (extend function signature; the current callers keep working because the new arg is defaulted).

## 2. Marketplace claim → start → submit rework

**Current behavior (from code)**
- `ProjectMarketplace` shows pending client_projects; clicking calls `claim_project` RPC which immediately inserts a `project_assignments` row with `status='active'`. There is no separate "start work" gate. `SubmitWork` project dropdown lists all `active` assignments.

**New behavior**
- **Claim = reserve, not start.** `project_assignments.status` will use three states: `claimed`, `in_progress`, `submitted`. `claim_project` inserts `status='claimed'`.
- **Start Work button.** On the dashboard's "My Claimed Jobs" list, a `Start Work` button flips the row from `claimed` → `in_progress` via a new RPC `start_project_work(p_project_id)`. Only then does the project appear in the SubmitWork picker.
- **Submit flow.** `SubmitWork` project dropdown filters to assignments where `status='in_progress'`. After a successful submission insert, the assignment flips to `submitted` (via a trigger on `submissions` insert, so it works regardless of which UI submitted).
- **One-active-claim rule.** `claim_project` and `claim_job_contract` already block new claims while an active assignment exists — extend the "active" check to include both `claimed` and `in_progress` statuses (currently only `active`). Same rule for job contracts.

**UI changes**
- `ProjectMarketplace.tsx`: after clicking Claim, close the dialog and refresh; the claimed card moves out of the marketplace list into a new "My Claimed Jobs" section (or reuse `ActiveContracts` — I'll add a "Start Work" button to entries with `status='claimed'`).
- `ActiveContracts.tsx`: show a "Start Work" primary button when `status='claimed'`; when `status='in_progress'`, show the existing "Submit Work" link.
- `SubmitWork.tsx`: query `project_assignments` where `designer_id = me AND status = 'in_progress'` and only show those in the project dropdown.

## 3. Technical details (for devs)

**Migration**
```sql
-- reference images
ALTER TABLE public.client_orders     ADD COLUMN reference_images text[] DEFAULT '{}';
ALTER TABLE public.client_projects   ADD COLUMN reference_images text[] DEFAULT '{}';

-- assignment status: default 'claimed', backfill existing 'active' → 'in_progress'
UPDATE public.project_assignments SET status = 'in_progress' WHERE status = 'active';
ALTER TABLE public.project_assignments ALTER COLUMN status SET DEFAULT 'claimed';

-- RPCs
CREATE OR REPLACE FUNCTION public.start_project_work(p_project_id uuid) ...
-- updates my assignment from 'claimed' to 'in_progress'

-- update public.claim_project and public.claim_job_contract:
--   the "already-active" guard now blocks when status IN ('claimed','in_progress')

-- trigger: after INSERT on public.submissions, flip the matching assignment to 'submitted'
```

**Storage bucket + policies** created via `storage_create_bucket` + a migration for `storage.objects` RLS.

**Edge function** `process-client-order` accepts optional `referenceImages: string[]` and persists it on the created `client_orders`/`client_projects` rows and the Discord notification.

## Confirmation needed
- OK to make `client-order-attachments` a **public** bucket? (Simpler for Discord embeds and admin previews. Alternative = private + signed URLs.)
- Should reference images also render on the client-facing `/track/:token` project page? (Small extra UI, straightforward.)

Reply "go" (with answers to the two questions if you have preferences) and I'll implement.