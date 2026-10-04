# Prime Haven

Prime Haven (https://primehaven.tech) is a Ghana-based creative and technology agency and freelance marketplace.

- Clients order and pay for services (Paystack / Korapay); paid projects go to a marketplace where one vetted professional claims each job.
- Client approval completes a job; professionals earn a share of the job price and withdraw via mobile money.
- Talent join through a screening funnel: application, intro video, assessment, $15 registration, email verification.

## Layout
- `artifacts/prime-haven/` — React + Vite + Tailwind web app
- `supabase/functions/` — backend functions (payments, emails, screening, admin)
- `supabase/migrations/` — database schema history

Built and hosted with Lovable. Browser config uses only public keys; secrets live in backend function settings.
