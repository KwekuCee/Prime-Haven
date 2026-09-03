# Client Portal, Marketplace Flow & Finance Hub Fixes

## 1. Clients get real client accounts and their own sign-in

Today a client who pays is created as an unconfirmed account with no password (and, on the free-promo path, as a *designer*). That's why signing in landed on the talent dashboard.

- Checkout (paid and free) creates the account with `account_type: 'client'`, so the backend assigns the client role and skips creating a talent profile.
- The password the client types at checkout is set on the account, so they can sign in right away. A "Please verify your email" banner shows in the client portal until they click the confirmation link.
- New dedicated page `/client/login` (client-branded sign-in + "forgot password"), linked from the order confirmation screen and from the main login page.
- Login routing decided by role, not by guesswork: client role -> `/client/dashboard`, admin -> `/superadmin`, talent -> `/dashboard`. Clients who land on `/login` are redirected to their portal.
- Client portal guarded so only client-role accounts can open `/client/*`.

## 2. Client details recorded in the Client database

- Both checkout paths write the client into the central client list (name, email, WhatsApp, company) and link the created project to that client record, so every submitted project has a client row in Superadmin -> Clients.
- Existing clients are matched by email instead of duplicated.

## 3. Client <-> professional collaboration and completion

- When a professional claims a project, the client's portal shows the project with a "Message your professional" panel; the professional sees the same thread from their project workspace. (Chat panel already exists; it gets wired into the client project view and the claimed-job view.)
- Client project detail page lists submitted deliverables with **Approve** and **Request revision**.
- On client approval: project marked completed, talent's points and earnings released, and the project shows as Completed in the Superadmin dashboard. Admins keep a view + emergency override, they cannot approve on the client's behalf.

## 4. Payments recorded in the Finance Hub with the 70/30 split

- Each confirmed Korapay/Paystack payment writes a payment record so it appears in the Finance Hub ledger with gateway, reference and amount.
- Each paid project stores its split: 70% earmarked for the talent (released on client approval) and 30% Prime Haven profit.
- Finance Hub cards recalculated from those records: gross collected, talent share (pending vs released), Prime Haven profit.

## 5. Withdrawals: instant Korapay payout + request removal

- Approving a pending request in the Finance Hub triggers the Korapay mobile-money payout immediately and reports the real result (sent / processing / declined) instead of failing silently.
- New **Remove request** action on each pending row, with a confirmation dialog, for requests already settled outside the platform.
- Before removal the system checks whether that talent already has a completed payout of the same amount and tells the admin what it found, so nobody gets paid twice.
- Removal is recorded in the admin activity log and the talent is notified.

## 6. Clear the ledger

- **Clear ledger** button (admin-only, confirmation dialog) archives every current ledger record. Archived rows disappear from the ledger view but stay in the database; a "Show archived" toggle can bring them back. Nothing is deleted.

## 7. Started projects appear in the Marketplace

- Confirmed paid projects (including 100%-promo orders) are published to the marketplace immediately, with the correct profession requirement, and are claimable first-come-first-served by a single professional.
- Verification pass on the existing marketplace query so projects awaiting a claim always show, and disappear once claimed.

## Technical notes

- Migrations: `account_type` handling for client signups (client role, no `designer_details`); `clients.id` link on `client_projects`; split/profit columns or settings-driven values on paid projects; `archived_at` on `payments` plus an admin-only archive function; RPC for admin removal of a withdrawal request (audit-logged). Every new/changed table keeps RLS plus explicit grants.
- Edge functions: `process-client-order` (set password + `account_type: 'client'`, upsert client, link project, record payment + split), free-promo path in `StartProject.tsx` aligned with it, `approve-withdrawal` returns precise Korapay status.
- Frontend: new `ClientLogin.tsx`; `Login.tsx` role-based routing; client route guard; `ClientDashboard.tsx` / `ClientProjectsReview.tsx` gain chat + approve/revision; `FinanceDashboard.tsx` gains remove-request, clear-ledger, archived toggle and recalculated cards.
- Auth config: email confirmations stay on; password is set at checkout so sign-in works before confirmation, with an in-app verify banner.
