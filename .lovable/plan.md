## Goal

Add a single switch in the Superadmin dashboard that disables every ad on the platform — Adsterra, Google AdSense, and Ezoic — for both authenticated users and anonymous visitors, taking effect within ~30 seconds without a redeploy.

## Good news: most of the plumbing already exists

- `src/hooks/useAdsEnabled.ts` already reads `system_settings.ads_enabled`, polls every 30s, and exposes `setAdsEnabledSetting(enabled)` for admins.
- `src/components/ThirdPartyLoader.tsx` only injects the Adsterra + Ezoic scripts when `adsEnabled === true`.
- `src/components/AdUnit.tsx` returns `null` when ads are off (covers AdSense slots in Blog, Index, Promo).
- `index.html` no longer has any inline Adsterra script — it's fully client-driven.

Two things are missing, which this plan fixes.

## Changes

### 1. Make the `ads_enabled` flag readable by visitors

Today `system_settings` is admin-only, so visitors always see the default (ads ON) regardless of the toggle. Add one row-scoped public read policy so only the `ads_enabled` row is readable by anyone:

```sql
CREATE POLICY "Anyone can read ads_enabled flag"
ON public.system_settings
FOR SELECT
TO anon, authenticated
USING (key = 'ads_enabled');

GRANT SELECT ON public.system_settings TO anon;
```

All other settings stay admin-only.

### 2. Add the toggle UI in the Superadmin dashboard

In `src/pages/SuperAdminDashboard.tsx`, add a small "Ads" card near the existing controls (next to the Adsterra stats area) containing:

- A shadcn `Switch` bound to the current `useAdsEnabled()` value.
- Label: "Show ads on the platform" with a helper line "Disables Adsterra, AdSense and Ezoic for every visitor."
- On toggle, call `setAdsEnabledSetting(next)` and show a `sonner` toast confirming the new state.
- Initial value is fetched via the same hook so it reflects the current DB state on mount.

No new tables, no new edge functions.

## How "off" propagates

```text
Admin flips Switch
        |
        v
setAdsEnabledSetting(false) -> system_settings.ads_enabled = false
        |
        v
useAdsEnabled() polls every 30s (or notifies admin tab immediately)
        |
        +-> ThirdPartyLoader stops injecting Adsterra + Ezoic scripts on new page loads
        +-> AdUnit returns null -> AdSense ins tags disappear
        +-> EzoicAd returns null
```

Already-loaded Adsterra scripts in an open tab keep running until that tab reloads; new visitors and reloads see zero ads. This is acceptable for a manual admin toggle; if you want instant removal in open tabs we can also strip injected scripts on toggle — say the word and I'll add it.

## Out of scope

- No changes to AdSense / Ezoic accounts themselves.
- No per-page or per-role granularity (single global switch as requested).
