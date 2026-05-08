
# Promo Popup Feature

A configurable promotional popup that appears on the homepage 2-3 seconds after load. Managed entirely from the SuperAdmin dashboard with optional email capture.

## What gets built

### 1. Database
New table `promo_popups`:
- `title`, `description`, `image_url` (optional), `cta_label`, `cta_url`
- `collect_email` (boolean) — toggle email field on/off
- `is_active` (boolean) — only one active at a time, enforced by partial unique index
- `background_color`, `accent_color` (optional theming overrides)
- standard timestamps

New table `promo_email_signups`:
- `popup_id`, `email`, `captured_at`, `ip` (for basic dedupe/abuse)
- Unique index on `(popup_id, email)`

RLS:
- Public can `SELECT` only the single active popup
- Public can `INSERT` into `promo_email_signups` (rate-limited via edge function for abuse protection)
- Only superadmin/masteradmin can manage `promo_popups` and view signups

### 2. SuperAdmin Management UI
New page **`/superadmin/promo`** (linked from `AdminNavigation.tsx` with a Megaphone icon):
- Form to create / edit a promo (title, description, image upload to `blog-images` bucket, CTA label, CTA URL, toggle email capture, color pickers)
- Live preview of the popup as it will appear
- Toggle "Active" — activating one auto-deactivates others
- Tab showing collected email signups with CSV export

### 3. Homepage Popup Component
New `src/components/PromoPopup.tsx` rendered in `src/pages/Index.tsx`:
- Fetches the active promo on mount
- Shows after 2.5s delay using a Dialog (shadcn) with fade/scale animation
- Displays title, description, image, CTA button, and (if enabled) an email input + Subscribe button
- Email submit calls a new edge function `submit-promo-email` (validates with Zod, rate-limits by IP, inserts into `promo_email_signups`, sends a confirmation email via existing SMTP function)
- "Every visit" frequency — no localStorage suppression

### 4. Edge Function
`supabase/functions/submit-promo-email/index.ts`:
- Zod-validated email
- IP-based simple rate limit (max 5/hour per IP via in-memory or a small `rate_limits` check)
- Inserts signup, fires confirmation email through existing SMTP infra

## Technical notes
- Reuses existing `blog-images` public bucket for promo imagery
- Follows dark theme + `#fe4c18` accent and brand fonts
- Single source of truth: only one `is_active = true` row enforced via partial unique index `CREATE UNIQUE INDEX ... WHERE is_active`
- No changes to auth / RBAC — uses existing `has_role` helper for admin policies
- Mobile responsive (popup shrinks to ~92vw on small screens)

## Files added/changed
- migration: `promo_popups`, `promo_email_signups` + RLS
- `src/pages/ManagePromoPopup.tsx` (new)
- `src/components/PromoPopup.tsx` (new)
- `src/components/admin/AdminNavigation.tsx` (add link)
- `src/pages/Index.tsx` (mount `<PromoPopup />`)
- `src/App.tsx` (route)
- `supabase/functions/submit-promo-email/index.ts` (new)
