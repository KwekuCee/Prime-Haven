# Client accounts: save details at signup and land in the client portal

## What's wrong today (verified)

1. **Client details are only saved after a successful payment.** The details a visitor types on the Start Project page (name, business, email, WhatsApp, password) are held in the browser until the payment provider confirms. The step that creates the account and writes the row into the client list runs only after that confirmation, so an abandoned or failed payment leaves no client record anywhere in the admin client list.
2. **New client sign-ins can be pushed to the professional dashboard.** Access to the client portal is granted by a stored "client" marker on the account. When that marker is missing, the app tries to add it from the browser, but the security rules only allow an owner-level admin to write it, so the attempt fails silently and the person is redirected to the professional dashboard instead of `/client/dashboard`.
3. **Accounts default to "professional".** The account-creation rule in the database gives every new account the professional role plus a professional profile row unless the account was explicitly tagged as a client at creation time. Any client account not created through the paid-order step therefore behaves like a professional account.

## What will change

### 1. Save the client the moment they submit their details
- New server function `capture-client-lead`, called from the Start Project page right before the payment window opens.
- It creates (or finds) the client's account with the password they chose, tagged as a client, and upserts their row into the central client list (name, email, WhatsApp, business) — so they appear in the superadmin client list immediately.
- The paid-order step keeps doing what it does now, but becomes idempotent against this: it finds the existing account/client row and links the order and project to it. No duplicate accounts or client rows (email is already unique).
- Clients captured before payment show as having no paid order yet, so the admin can see who dropped off.

### 2. Make the client role reliable
- New database routine `ensure_client_role()` that a signed-in user can call for themselves. It grants the `client` role **only** if their email already exists in the client list, a client order, or a client project — otherwise it does nothing. It also removes a stray professional role/profile row for that same account.
- Replace the three browser-side role writes that currently fail silently (`Login.tsx`, `ClientLogin.tsx`, `client/ClientRoute.tsx`) with a call to this routine.
- `ClientRoute` then re-reads the role and allows entry, so a genuine client always reaches `/client/dashboard` and never the professional dashboard.

### 3. Backfill
- One-off data fix: for every email that appears in the client list or in a completed order and has an account, ensure the `client` role exists and remove any professional role/profile row for those accounts (admin accounts excluded).

## Technical notes

- New edge function: `supabase/functions/capture-client-lead/index.ts` (service role; `verify_jwt = false`, called by anonymous visitors). Uses `auth.admin.createUser` with `user_metadata.account_type = 'client'` so the existing `handle_new_user` trigger assigns the client role, then upserts `public.clients` on `email`.
- Migration adds `public.ensure_client_role()` — `SECURITY DEFINER`, `search_path = public`, `EXECUTE` granted to `authenticated` only, scoped strictly to the caller's own `auth.uid()`/email.
- `StartProject.tsx`: call `capture-client-lead` after validation, before `window.Korapay.initialize` and before the free/promo path; failure there shows a toast and blocks checkout so we never take money without a record.
- `process-client-order`: unchanged behaviour, still upserts the client row and role (safe re-run).
- No schema changes to existing tables; no policy loosening.
