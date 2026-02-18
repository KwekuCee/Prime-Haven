
# SuperAdmin Enhancement Plan

This is a significant set of changes spanning database schema updates, new pages, and extensive modifications to existing logic. Here's the detailed breakdown:

---

## 1. Full User Edit Dialog (Edit All Details)

Currently, user management only allows suspend/activate/promote/demote/gift points/delete. We will add an **"Edit User" dialog** accessible from the user actions dropdown that allows editing:

- Full name, phone, email, professional title, experience level
- Total points, monthly points (direct edit, not just gift)
- Skills, portfolio URL, payment method, payment details
- Registration fee paid status, active status

All changes will be logged to system_logs.

---

## 2. Service-Category Revenue System

### Database Changes
- Add a new system setting key: `monthly_revenue_by_category` storing revenue for each category:
  - `graphic` (Logo, Brand Identity, Print, Flyer)
  - `uiux` (UI/UX Design)
  - `web` (Web Design)
- The existing `monthly_revenue` setting will become the **total** (sum of all categories).

### Salary Calculation Change
- Each designer's estimated salary is calculated **only from the revenue pool of their submission service types**.
- When revenue is updated, salaries are recalculated per category: a designer's share of graphic revenue is based on their graphic-related points vs. all graphic-related points, and similarly for UI/UX and Web.

### Revenue Edit Modal Update
- The revenue modal will show three input fields (Graphic Design, UI/UX Design, Web Development) plus a computed total.
- On save, all designer salaries are recalculated by category.

---

## 3. Separate Admin Pages for UI/UX and Web Developers

### New Pages
- `/superadmin/uiux` -- UI/UX Admin Dashboard
- `/superadmin/web` -- Web Development Admin Dashboard

Each page will:
- Filter submissions to only show relevant service types (uiux for UI/UX page, web for Web page)
- Have the same approval workflow (PH Approve, Client Accept, Reject, Client Reject)
- Show filtered users and stats for that category
- Be accessible to superadmin and masteradmin roles

### Navigation
- Add navigation links in the SuperAdmin header to switch between: **All (Graphic)**, **UI/UX**, **Web Dev**
- The main `/superadmin` page remains the primary Graphic Design dashboard (logo, branding, print, flyer service types)

### Masteradmin Superiority
- Masteradmin can access all pages and override any action
- Superadmins promoted for a specific category can only see their category page (enforced via the existing role system)

---

## 4. Corrections/Revisions Feature

### Flow
1. When a submission has status `client_rejected` or admin requests corrections, the designer sees a **"Submit Correction"** button on their dashboard
2. The designer uploads corrected files, which creates a new submission linked to the original (we will add a `parent_submission_id` column)
3. When the correction is approved (PH approved), the designer gets **+4 points** (configurable via `correction_points` system setting)

### Database Changes
- Add `parent_submission_id` (uuid, nullable) to `submissions` table to link corrections to originals
- Add `correction_points` system setting (default: 4)

### SuperAdmin Changes
- When viewing a `client_rejected` submission, admin can click "Request Correction" which updates status to `correction_requested`
- When a correction submission comes in (has `parent_submission_id`), it shows as a correction in the queue
- Approving a correction awards the correction points (4 by default)

### Designer Dashboard Changes
- Submissions with status `correction_requested` show a "Submit Correction" button
- Correction submission form pre-fills project name and client reference from original

---

## 5. Monthly Auto-Reset and Downloadable Records

### Points Auto-Reset on the 29th
- Create a database function + cron job (via pg_cron and pg_net) that:
  1. On the 29th of each month, snapshots all designer data (points, salaries, submissions) into a `monthly_records` table
  2. Resets all `monthly_points` and `salary_estimated` to 0
  3. Logs the action in system_logs

### New Table: `monthly_records`
```text
monthly_records
  - id (uuid)
  - month (integer)
  - year (integer)
  - record_data (jsonb) -- full snapshot of all designers, submissions, payments, salaries
  - created_at (timestamp)
```

### Download Monthly Reports
- Add a **"Monthly Reports"** tab or section in the SuperAdmin dashboard
- Lists available months with download buttons
- Downloads a comprehensive CSV/Excel containing:
  - All transactions for the month
  - All submissions with status
  - All designer salaries earned
  - Points breakdown per designer
- Also enhance the existing export to include salary information and more detailed status

### Edge Function for Report Generation
- Create an edge function `generate-monthly-report` that compiles data for a given month/year and returns a downloadable CSV

---

## Technical Summary

### Database Migrations
1. Add `parent_submission_id` column to `submissions`
2. Create `monthly_records` table with RLS
3. Add system settings: `monthly_revenue_by_category`, `correction_points`
4. Set up pg_cron job for the 29th monthly reset

### New Files
- `src/pages/UIUXAdminDashboard.tsx` -- UI/UX admin page
- `src/pages/WebDevAdminDashboard.tsx` -- Web dev admin page
- `src/components/admin/EditUserDialog.tsx` -- Full user edit dialog
- `src/components/admin/AdminNavigation.tsx` -- Shared admin nav header
- `src/components/admin/MonthlyReports.tsx` -- Monthly reports section
- `supabase/functions/generate-monthly-report/index.ts` -- Report generation

### Modified Files
- `src/pages/SuperAdminDashboard.tsx` -- Revenue by category, edit user, corrections, monthly reports tab, admin navigation
- `src/pages/Dashboard.tsx` -- Show correction button for designers, category-based salary display
- `src/pages/SubmitWork.tsx` -- Support correction submissions (pre-fill from parent)
- `src/App.tsx` -- Add new routes for `/superadmin/uiux` and `/superadmin/web`

### Routes Added
- `/superadmin/uiux`
- `/superadmin/web`
