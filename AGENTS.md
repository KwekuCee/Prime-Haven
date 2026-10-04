# Project decisions

- Keep the homepage hero as a sticky first section and its following content as a higher-layer, opaque scrolling section so the page moves over the Earth image without scroll scripting.- Every browser-called Edge Function wraps its handler in `withCors` from `_shared/cors.ts`; allowed origins live only in that file (webhook and MCP endpoints excluded). Why: one place to lock down cross-site access.
- Every `/superadmin/*` route is wrapped in `AdminRoute` (uses `useAdminGuard`) in App.tsx; new admin pages must be wrapped too. Why: one central place enforces admin access in the UI.
