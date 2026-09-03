# Client dashboard = superadmin's client view

Rebuild the signed-in client's dashboard so it shows the same information the superadmin sees for that client: their client record details on top, plus the full orders/projects table exactly as the superadmin Client Orders view renders it. Existing extras (streak, live feed, posted jobs widget) are removed. Client details become editable by the client. Approve / request-correction actions stay.

## Blocking issue found

The client's own data is currently not readable by them:

- `client_orders` has no view rule for clients — only superadmins/masteradmins can read it. The current client dashboard queries it by email, so it silently returns nothing.
- `clients` has a single admin-only rule, so a client can neither read nor edit their own record.

So this work needs a backend access change first, otherwise the new dashboard renders empty.

## Backend changes

1. Add view access on `client_orders` for the signed-in client, matched on their verified account email.
2. Add view + edit access on `clients` for the signed-in client, matched on email. Editing is limited to name, WhatsApp, company, and notes — email, primary flag, and timestamps stay server-controlled.
3. Confirm existing grants cover authenticated reads on both tables; add any missing grant.

## Frontend changes

`ClientDashboard.tsx` is rewritten around three blocks:

**1. Client profile card (editable)**
Name, email (read-only), WhatsApp, company, notes, primary-client badge, joined date — sourced from the `clients` record for the signed-in email. An "Edit details" dialog saves back to the same record. If no `clients` row exists yet for the email, show an inline prompt to complete details and create it.

**2. Summary stats**
Total spent, active projects, completed projects, pending payments — same figures the superadmin sees, in USD via the existing rate hook, computed from this client's orders only.

**3. Orders & projects table**
Mirrors the superadmin Client Orders table columns: service, tier, price, payment status, project status, reference, date, assigned professional. Includes the same search + status filter and CSV export, scoped to this client. Status editing stays superadmin-only. Desktop table plus mobile card layout, matching the admin component's responsive pattern.

**4. Review actions retained**
The existing per-delivery approve / request-correction panel stays, attached under the relevant project rows so approvals still trigger the superadmin-side status change and award the professional's points.

Removed from the dashboard: `ClientActivityStreak`, `ClientLiveFeed`, `ClientPostedJobs`. The verification banner stays.

## Technical notes

- Superadmin reference component: `src/components/admin/ManageClientOrders.tsx`; client-record fields from `src/pages/ManageClients.tsx`.
- Reuse `useUsdRate` for all money display; prices stored in GHS are converted for display.
- Assigned professional name resolved through the existing `get_designer_public_profile` RPC, as `ClientProjectReview` already does.
- Client-owned projects are read from `client_projects` (already permitted by the "Clients view their own projects" rule) and joined to orders by email for the assigned-professional column.
- No changes to the professional dashboard, marketplace, or admin screens.
