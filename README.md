# Prime Haven

Prime Haven is a modern digital agency and creative platform built with React, TypeScript, Tailwind CSS, and Supabase.

## Getting started

```sh
npm install
npm run dev
```

Then open the local URL shown by Vite.

## Project structure

- `src/` – main application code
  - `components/` – reusable UI and homepage sections
  - `pages/` – route pages for public site, dashboards, auth, and client workflows
  - `hooks/` – custom React hooks for auth, tracking, notifications, and app behavior
  - `contexts/` – app context providers such as user settings
  - `integrations/supabase/` – Supabase client and typed database integration
  - `lib/` – utilities, helpers, validators, and invoice generation
- `supabase/` – Supabase functions, migrations, and config
- `public/` – static assets and manifest files

## Development scripts

- `npm run dev` – start the Vite dev server
- `npm run build` – build the app for production
- `npm run build:dev` – build in development mode
- `npm run lint` – run ESLint
- `npm run preview` – preview production build locally

## Notes

- The app uses Supabase for authentication, storage, and backend functions.
- The frontend is configured as a PWA with `vite-plugin-pwa`.
- The project uses `next-themes` to support dark/light mode.
- The default app alias `@` points to `./src`.

## Brand

This project is branded as **Prime Haven**.

## Contact

For support when running locally, use the email configured in your environment variables or project documentation.
