# Client Portal, Superadmin & Currency Overhaul

## 1. Superadmin: delete any user

Add a "Delete" action to every row in the Users table (desktop dropdown and mobile card menu), not just designers. A confirmation dialog names the account and warns the action is permanent.

Deletion is a full account removal handled server-side: login credentials, profile, role, designer details, submissions, earnings, payout methods, withdrawals, payments, assignments and badges. Admin accounts are deletable too, except the currently signed-in admin. Every deletion is written to the audit log.

## 2. Remove the Messaging Hub

Delete the Messaging Hub sidebar entry, its tab panel, and the `AdminMessagingHub` component from the superadmin account.

## 3. Paid client projects also become Job Contracts

When a client's payment is confirmed, in addition to the project record the system creates a matching job contract (title, category, description, budget, deadline, reference files, target professions). Both stay linked so a claim on one reflects on the other, and completion/approval closes both. The Projects page keeps showing the project as it does today.

## 4. Marketing assets reach the Partner dashboard

Assets created in the superadmin Marketing Assets manager become downloadable in the Partner Program dashboard's Marketing Assets section: each asset gets a working download action using a time-limited secure link, with title, type and description shown.

## 5. Reference images on client project submission

The client checkout keeps its optional reference-image upload, and those images are attached to the Discord notification when the order is submitted, so the team sees them with the brief. The same upload is added to the in-portal "Start a Project" flow so both entry points behave identically.

## 6. Add new services and prices from the superadmin pricing page

The pricing page gains an "Add Service" action: service name, internal key, tier, price, description, feature list, category and active toggle. Newly added active services appear automatically in the public Start Project page and the client portal's Start a Project page, since both read the same pricing source. Deleting/deactivating a service removes it from those pages.

## 7. Currency: $ everywhere, cedis at payment

- All displayed amounts across public pages, client portal, talent dashboards and superadmin (prices, earnings, salaries, ledger, withdrawal amounts) show in US dollars.
- Stored service prices are treated as USD from now on; you re-enter the correct dollar prices in the pricing page after release.
- At checkout the visitor's country is detected. Ghana-based visitors are charged in GHS using the live USD→GHS rate; everyone else is charged in USD. The conversion is shown before payment ("$120 ≈ GH₵1,860") and the amount actually charged is what the gateway receives.
- Ledger/earnings records store the dollar amount plus the charged currency and rate used, so finance totals stay consistent.

## 8. Client Dashboard becomes its own product

- Remove Partner Program and Marketplace from the client navigation entirely (they remain for registered professionals only), and block the routes for client accounts.
- Payments page lists the client's own payments per service: date, service and tier, amount in USD (and cedis charged where applicable), status, reference, and invoice download.
- "Talk to the Designer" shows only the professional who claimed that client's job — one conversation thread per active project, with file sharing. No directory, no other users.
- Add a clear review area: each submitted deliverable can be previewed, then **Approve** or **Request Correction** (with written feedback).
  - Approve marks the submission approved for the superadmin dashboard and awards the professional the points for that submission plus their revenue share.
  - Request Correction marks the submission (and project) as "correction" in the superadmin dashboard and notifies the professional.
- Client dashboard layout, navigation and styling are visually distinct from the talent dashboard.

## Technical notes

- New edge function `delete-user` (service-role) performs cascading deletion plus auth user removal; called from `SuperAdminDashboard.tsx`.
- Remove `AdminMessagingHub.tsx`, its import, tab content, and the sidebar item in `SuperAdminLayout.tsx`.
- `process-client-order` and `payment-webhook`: after inserting into `client_projects`, insert a linked `job_contracts` row; add a `client_project_id` column on `job_contracts` for the link, and keep `claim_job_contract` / `claim_project` in sync via trigger.
- Marketing assets: signed-URL download helper in `AffiliateDashboard.tsx` assets section (storage bucket read via signed URL, admin-managed uploads unchanged).
- Pricing: insert path in `ManagePricing.tsx` (`service_pricing` insert with `service_type`, `tier`, `discord_category`); `StartProject.tsx` and `ClientStartProject.tsx` already read active rows.
- Currency: extend `src/lib/currency.ts` with a country lookup (cached, IP-based with graceful USD fallback) and a shared `formatMoney` helper; replace hardcoded `GH₵` formatting across pages with it. Gateway call converts with `usdToGhs` only for GH visitors.
- Client portal: prune `DashboardLayout.tsx` client nav, guard `/marketplace` and `/affiliate/*` against client role, rewrite `ClientPayments.tsx` amounts to USD, scope `/client/messages` to the claimer of the client's project, and surface `ClientProjectReview` approve/correction actions (existing `approve_project_submission` and `request_project_revision` RPCs; verify point award and superadmin status mapping, adding a migration if the correction status is not persisted on the project).
