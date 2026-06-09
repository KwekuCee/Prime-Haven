# Prime Haven

Prime Haven is a freelance design & tech marketplace where clients post projects and designers/developers apply for work — Ghana's premier creative hub.

## Run & Operate

- `pnpm --filter @workspace/prime-haven run dev` — run the web app (workflow: "artifacts/prime-haven: web")
- `pnpm run typecheck` — full typecheck across all packages
- Required env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase credentials (set as secrets)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind v3 + shadcn/ui
- Auth & Data: Supabase (kept from original Lovable project)
- Routing: react-router-dom v6
- Rich text: Tiptap
- DnD: @dnd-kit
- i18n: i18next

## Where things live

- `artifacts/prime-haven/src/` — all frontend source
- `artifacts/prime-haven/src/integrations/supabase/` — Supabase client + generated types
- `artifacts/prime-haven/src/pages/` — all page components (60+ pages)
- `artifacts/prime-haven/src/components/` — shared components (admin/, auth/, client/, dashboard/, ui/)
- `artifacts/prime-haven/src/hooks/` — custom hooks (useAuth, useNotifications, etc.)
- `artifacts/prime-haven/src/index.css` — design tokens (dark navy + orange theme)
- `artifacts/prime-haven/tailwind.config.ts` — Tailwind v3 config

## Architecture decisions

- Supabase kept as-is (auth + 30+ tables + storage + edge functions) — too complex to replace inline
- Tailwind v3 used (not v4) — original Lovable project used v3, wired via postcss
- react-router-dom v6 used (not wouter) — original app routing preserved
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` stored as Replit secrets

## Product

- Landing page with services, portfolio, testimonials, stats, blog
- Auth: email/password signup/login, Google OAuth, password reset via Supabase
- Designer dashboard: earnings, job contracts, submissions, portfolio management
- Client dashboard: project orders, payments, support tickets
- Super admin panel: manage users, orders, team, blog, pricing, promos, analytics
- Affiliate dashboard, SMM dashboard, project chat, marketplace

## User preferences

- Keep Supabase as the backend — the user chose to keep their existing Supabase project

## Gotchas

- Third-party ad scripts (Ezoic, AdSense, Adsterra) return 403 in dev — expected, they need a live domain
- `vite-plugin-pwa` and `lovable-tagger` are dropped (Replit doesn't need them)
- Fonts: PP Neue Machina (local OTF in /public/fonts/), Space Grotesk + Switzer (Google Fonts/Fontshare CDN)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
