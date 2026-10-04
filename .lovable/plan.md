# Homepage cinematic scroll refresh

## Goal
Keep the current Earth hero and rounded service capsule, remove the hero pinning effect, and turn the homepage below it into a cinematic sequence where each section enters smoothly as the visitor scrolls.

## Changes

1. **Expand the hero service capsule**
   - Replace the three hardcoded labels with five services sourced from the existing shared service list, so the hero stays aligned with the rest of the site.
   - Show Graphic Design, UI/UX Design, Web Development, Mobile App Development, and Motion Graphics.
   - Keep the capsule compact on desktop and make it horizontally scrollable on small screens without clipping or shrinking the labels.

2. **Remove the sticky hero behavior**
   - Return the hero to the normal page flow while keeping its current full-screen visual impact.
   - Preserve the fixed rounded navbar; only the hero’s sticky behavior will be removed.
   - Remove the higher-layer overlap structure that currently causes later sections to slide over the Earth image.

3. **Create the cinematic transition after the hero**
   - Add a deliberate open-space transition immediately below the hero.
   - As the visitor scrolls through that space, introduce the first content with a soft opacity, upward movement, slight scale, and motion-blur reveal rather than an abrupt cut.
   - Keep the timing quick and controlled so the page feels cinematic without becoming slow or difficult to navigate.

4. **Apply a consistent reveal system to the remaining homepage**
   - Add a reusable scroll-reveal wrapper for the homepage sections.
   - Reveal each major section when it approaches the viewport, with subtle variation in direction and stagger for internal cards or rows.
   - Preserve every existing section, link, form, advertisement position, and truthful piece of content.
   - Ensure reveals run once and content remains fully readable and accessible afterward.

5. **Accessibility and performance safeguards**
   - Disable blur and movement for visitors who prefer reduced motion.
   - Use viewport-triggered animation rather than continuous scroll calculations.
   - Avoid layout shifts, horizontal overflow, and oversized empty space on phones.

6. **Verification**
   - Test the complete homepage scroll at desktop and phone widths.
   - Confirm the navbar remains fixed, the hero no longer sticks, all five service labels are usable, every section reveals smoothly, and no content overlaps or disappears.
   - Check browser errors and the final build status.

## Technical details
- Reuse the existing Framer Motion setup and shared `CORE_SERVICES` data.
- Introduce one small module-level reveal component/configuration instead of duplicating animation logic across every section.
- Keep the existing Ink & Signal colors, Sora/Manrope typography, Earth image, and light-only visual system unchanged.
