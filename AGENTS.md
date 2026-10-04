# Project decisions

- Keep the homepage hero in normal document flow and reveal later sections with viewport-triggered cinematic motion that respects reduced-motion settings. Why: the content should arrive progressively without pinning or scroll scripting.
- Every browser-called Edge Function wraps its handler in `withCors` from `_shared/cors.ts`; allowed origins live only in that file (webhook and MCP endpoints excluded). Why: one place to lock down cross-site access.
- Every `/superadmin/*` route is wrapped in `AdminRoute` (uses `useAdminGuard`) in App.tsx; new admin pages must be wrapped too. Why: one central place enforces admin access in the UI.
- The UI/UX, Web and Graphic department admin pages are thin config wrappers around `components/admin/DepartmentAdminDashboard.tsx`. Why: one review screen to fix instead of three drifting copies.
- Shared reads go through the app-wide cache in `lib/queryClient.ts`; system settings are read via `fetchSystemSettings()` and writes call `invalidateSystemSettings()`. Why: avoids repeated identical requests and keeps screens consistent.
