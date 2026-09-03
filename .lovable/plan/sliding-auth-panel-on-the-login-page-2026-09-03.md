# Sliding auth panel on the login page

Turn the login page into one screen with three sign-in modes (Talent, Client, Admin) that swap with a smooth sliding animation, while Register keeps navigating to the existing registration flow.

## Behaviour

- Default: dark brand panel on the left, Talent sign-in form on the right (as today).
- Click "Client Sign-in": the dark panel slides smoothly to the right side and the Client sign-in form appears on the left.
- Click "Admin Portal": the dark panel stays/slides to the right and the Admin login form is revealed.
- Click "Register": normal navigation to `/register` (unchanged).
- Each mode shows a link back to Talent sign-in, so users can switch freely.
- The brand panel copy adapts per mode (e.g. talent, client, admin headline/subtitle) while keeping the same dark styling and kente pattern.
- Mobile (no split layout): panels stack as today, forms cross-fade instead of sliding.
- Deep links `/client/login` and `/superadmin-login` keep working as separate routes; the sliding page is an in-place convenience.

## Technical notes

- Edit only `artifacts/prime-haven/src/pages/Login.tsx` plus two new small form components extracted from the existing pages:
  - Client form: reuse the email/password + `signIn` logic and role routing from `ClientLogin.tsx` (redirects to `/client/dashboard`, admin/talent fallbacks preserved).
  - Admin form: reuse the `admin-login` edge function call and session handling from `SuperAdminLogin.tsx` (redirects to `/superadmin`).
- Add a `mode` state (`'talent' | 'client' | 'admin'`) in `Login.tsx`. Layout uses a flex container where the brand panel and form panel swap order via CSS `order` plus a transform/transition (or Motion) so the movement reads as a slide rather than a jump.
- Animation: ~500ms ease-in-out transform on the two panels; forms fade/slide in after the panel settles. Respect `prefers-reduced-motion` by disabling the transform transition.
- Preserve all current auth behaviour: fresh sign-out on mount, verification gating, safe `next` redirect, resend verification, password visibility toggle, validation messages.
- Keep existing design tokens (cream/ink/orange, Space Grotesk / DM Sans, underline inputs). No new colors.
