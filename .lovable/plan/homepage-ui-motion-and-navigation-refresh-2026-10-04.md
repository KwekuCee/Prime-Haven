# Homepage UI, motion, and navigation refresh

## Goal
Create a sharper editorial homepage for Prime Haven using the selected Ink & Signal palette, Sora headings, Manrope body text, and a magazine-style content flow. Keep every existing route and business flow working.

## What will change
- Refine the fixed rounded navbar with clearer hierarchy, stronger active states, improved spacing, and a simpler mobile menu.
- Rebalance the opening so the Earth remains the visual anchor while the next section is visible sooner on desktop and mobile.
- Replace the fabricated community activity ticker with a truthful editorial trust strip using established platform promises.
- Reshape the homepage into a more varied editorial rhythm instead of repeating the same left-heading/right-list layout.
- Add a concise audience gateway for clients and talent, using the existing Start a Project and Apply flows.
- Add a focused trust/proof band using only existing verified platform data and content.
- Harmonize service, process, work, statistics, testimonials, FAQ, insights, join, contact, and footer sections through consistent typography, spacing, borders, and calls to action.
- Use quick reveal, image, and navigation transitions; disable non-essential movement when reduced motion is requested.
- Remove overlapping or noisy visual treatments, ensure the welcome and install prompts do not cover key content, and preserve phone-width overflow safety.

## Technical details
- Update homepage presentation components only; no database, payment, authentication, or workflow changes.
- Define all refreshed colors, surfaces, shadows, and typography through semantic design tokens.
- Keep the sticky hero beneath the opaque scrolling content, as required by the existing homepage behavior.
- Use existing shared service definitions and live portfolio/stat/testimonial data; do not invent projects, people, claims, or metrics.
- Verify the complete homepage at 1280px desktop and 390px mobile, including menu interactions, page anchors, reduced motion, console errors, and horizontal overflow.
