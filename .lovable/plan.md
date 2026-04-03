
## Phase 1: Database Performance (indexes)
- Add indexes on `submissions.designer_id`, `submissions.status`, `payments.user_id`, `job_contracts.status` (check if already exist from prior migration)

## Phase 2: Fix Forward Work Email
- Convert plain-text URLs in email body to clickable `<a>` tags
- Add proper HTML formatting for file links and design links
- Add email delivery logging with more detail for debugging

## Phase 3: Dashboard Aggregation Edge Function
- Create `dashboard-stats` edge function that returns all overview stats in a single call
- Update SuperAdminDashboard to use it on the overview tab

## Phase 4: Server-side Pagination & Search
- Add pagination to payments tab (already done for submissions/logs)
- Add search bars to payments tab

## Phase 5: Code Quality Refactoring
- Extract submissions tab into `AdminSubmissions` component
- Extract users tab into `AdminUsers` component  
- Extract payments tab into `AdminPayments` component
- Keep dialogs and shared state in parent

## Phase 6: Export & Notifications
- Monthly reports already have snapshot generation; add CSV export for reports
- Add activity history page for designers
