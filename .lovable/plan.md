
## Plan: Security Fixes + Full Documentation

### Phase 1: Critical Security Fixes (Database Migration)
1. **Fix exposed sensitive data** — Replace overly broad SELECT policies on `profiles` and `designer_details` with views that only expose non-sensitive fields for the leaderboard
2. **Fix monthly_records UPDATE policy** — Restrict from `USING (true)` to admin-only
3. **Fix 7 permissive INSERT policies** — Tighten `WITH CHECK (true)` on `consultation_bookings`, `testimonials` (anon), `newsletter_subscribers`, `project_feedback`, `client_orders`
4. **Realtime channel security** — Remove `system_settings` from realtime publication (use polling instead) to prevent eavesdropping
5. **Enable leaked password protection** via auth config

### Phase 2: Code-Level Fixes
6. **Add missing indexes** on frequently queried columns (`submissions.designer_id`, `payments.user_id`, `job_contracts.status`)
7. **Extract shared `useAdminGuard` hook** — Deduplicate admin access checks across all admin pages
8. **Add Zod validation** to key edge functions (`post-job-contract`, `generate-monthly-report`, `visitor-chat`)
9. **Update leaderboard queries** in frontend to use the new secure views

### Phase 3: Documentation Generation
10. **Generate a comprehensive DOCX document** containing:
    - Platform overview & tech stack
    - ERD (Entity Relationship Diagram) of all database tables
    - User flow diagrams (Registration, Submission, Payment)
    - Admin workflow flowchart
    - API/Edge function reference
    - RLS policy summary
    - Compensation model explanation
    - Deployment & environment notes

### Notes
- Items 9 (pagination/search/export) from the audit are feature additions, not fixes — I'll note them in the docs as "recommended improvements" rather than implementing them all now
- The documentation will be a downloadable `.docx` file with embedded Mermaid-rendered diagrams
