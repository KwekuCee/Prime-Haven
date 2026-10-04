# Navbar glass and dark homepage section redesign

## Goal
Strengthen the navbar’s glass effect and redesign the Insights and “Where Great Work Happens” sections as one polished dark editorial sequence that fits the homepage’s Ink & Signal visual system.

## Changes

1. **Navbar glassmorphism**
   - Keep the existing fixed rounded shape and navigation behavior.
   - Increase background translucency and backdrop blur while preserving strong text contrast.
   - Add a restrained inner highlight, thin translucent border, and softer depth shadow so it reads as glass rather than a solid black bar.
   - Keep desktop dropdowns and the mobile menu fully legible.

2. **Insights redesign**
   - Replace the current stacked card-heavy treatment with a cleaner editorial layout: a numbered section header, one strong lead story, and a restrained supporting-story rail.
   - Use larger typography, deliberate asymmetry, thin divider lines, and image-led storytelling rather than multiple floating glass cards.
   - Restyle category filters as a compact segmented row and integrate the newsletter signup as a closing editorial strip.
   - Preserve live blog data, filtering, article links, subscription behavior, and the rule that the section stays hidden when no posts exist.

3. **“Where Great Work Happens” redesign**
   - Recompose the client and talent paths as two distinct but connected panels within the same dark visual band.
   - Give the client path a warm technology/build visual and the talent path the Earth visual, with clearer hierarchy, shorter scannable benefits, and more prominent actions.
   - Retain the established $15 joining fee, 70% professional share, client approval language, and all current links.
   - Remove excessive rounded containers, glow effects, and visual noise while retaining subtle hover and reveal motion.

4. **Fix the broken technology texture**
   - Replace the confirmed corrupt `hero-bg.jpg` asset with a valid locally stored image generated for the client/build panel.
   - Keep meaningful alternative text and verify the image has valid dimensions and renders in the browser.

5. **Dark-section continuity**
   - Join Insights, “Where Great Work Happens,” Contact, and Footer through consistent ink surfaces, subtle borders, and controlled orange highlights.
   - Use only semantic design tokens; add any required dark-surface tokens to the global design system instead of hardcoding colors in components.
   - Respect reduced-motion preferences and keep the cinematic viewport reveals already in place.

6. **Verification**
   - Test desktop and phone layouts, navbar menus, article filters and links, newsletter form presentation, client/talent actions, image loading, horizontal overflow, and browser errors.
   - Confirm the final preview builds successfully.
