# SMM Dashboard: Real Platform Data

Goal: replace mock/username-only SMM data with live per-client metrics from TikTok, Instagram, Facebook, YouTube, and X.

## The core constraint (please read)

Instagram, Facebook, and TikTok **do not allow "type a username, get metrics"**. Each managed client must authorize us once via OAuth. YouTube and X can pull public data with a username.

So the UX becomes: for each managed client, admin (or the client themselves) hits a **"Connect [Platform]"** button, gets sent to that platform to log in and approve, comes back, and we then sync their real metrics on a schedule.

## Phase 1 — Meta Developer App (you do this, I guide)

I'll paste a step-by-step in chat. Summary:
1. Go to `developers.facebook.com`, create an app of type **Business**.
2. Add products: **Facebook Login**, **Instagram Graph API**, **Facebook Login for Business**.
3. Add OAuth redirect: `https://<project-ref>.supabase.co/functions/v1/oauth-callback-meta`.
4. Request permissions: `pages_show_list`, `pages_read_engagement`, `read_insights`, `instagram_basic`, `instagram_manage_insights`, `business_management`.
5. Submit for App Review (Meta requires this for production; dev mode works for testing with your own accounts).
6. Copy **App ID** + **App Secret** — I'll open a secure form to save them as `META_APP_ID` and `META_APP_SECRET`.

## Phase 2 — TikTok OAuth

TikTok connector gives one account. For per-client, I'll register a TikTok Login Kit app on `developers.tiktok.com`, request `user.info.basic`, `user.info.stats`, `video.list`. Same redirect pattern → `TIKTOK_CLIENT_KEY` + `TIKTOK_CLIENT_SECRET` secrets.

## Phase 3 — Database

Reuse existing `smm_platform_connections` table (add columns as needed):
- `client_id`, `platform` (tiktok/instagram/facebook/youtube/x), `platform_user_id`, `username`, `display_name`, `access_token` (encrypted at rest via pgsodium or just service-role-only column), `refresh_token`, `token_expires_at`, `connected_by` (superadmin or client), `is_active`.

Reuse `smm_analytics` for time-series metrics (followers, engagement, reach, impressions), and `smm_campaign_posts` for individual post metrics.

Add index on `(client_id, platform, captured_at)`.

## Phase 4 — Edge functions

- `oauth-init-meta` / `oauth-init-tiktok` → build authorize URL with state (client_id + return path), redirect.
- `oauth-callback-meta` / `oauth-callback-tiktok` → exchange code for tokens, list pages/IG accounts, upsert into `smm_platform_connections`, redirect back to dashboard.
- `youtube-lookup` → given a channel handle, calls YouTube Data API v3 with an API key, returns/upserts channel stats.
- `x-lookup` → uses existing X connector to fetch public profile + recent posts.
- `sync-smm-metrics` → invoked by cron every 6h. Loops active connections, refreshes tokens if expiring, pulls latest metrics + new posts, inserts into `smm_analytics` and upserts `smm_campaign_posts`.
- `disconnect-platform` → revoke on provider, mark inactive.

## Phase 5 — Cron (6-hour sync)

```sql
select cron.schedule('smm-sync-6h', '0 */6 * * *', $$
  select net.http_post(
    url:='https://<ref>.supabase.co/functions/v1/sync-smm-metrics',
    headers:='{"Content-Type":"application/json","apikey":"<anon>"}'::jsonb,
    body:='{}'::jsonb
  );
$$);
```

Runs via `supabase--insert` (not migration — contains project-specific URL/key).

## Phase 6 — UI

**Superadmin SMM dashboard** (`/superadmin?tab=smm`):
- Client picker → per-client card grid, one card per connected platform.
- Empty state per platform: "Connect Instagram" button → `oauth-init-*`.
- Connected state: current followers, 30-day growth chart, top 10 recent posts with per-post reach/likes/comments/shares.
- "Sync now" button (calls `sync-smm-metrics` for that connection).
- For YouTube/X: text field to enter handle/username → saves as a connection with `connected_by=admin, is_public_lookup=true`.

**Client SMM dashboard** (new route `/client/smm` — client-facing):
- Same layout, scoped to their own `client_id`.
- Self-serve "Connect [Platform]" buttons.
- Read-only metrics view.

Both views pull from `smm_analytics` and `smm_campaign_posts` — no live API on render.

## Technical notes

- Token storage: `access_token` and `refresh_token` are text columns; RLS restricts SELECT to `service_role` only (edge functions). Client + superadmin dashboards never receive tokens.
- Encryption at rest for tokens can be added later with pgsodium if compliance demands it.
- `state` parameter on OAuth = signed JWT containing `client_id`, `platform`, `return_to`, 10-min expiry, verified in callback.
- Meta long-lived tokens = 60 days; we refresh at day 50 in the cron.
- TikTok access tokens = 24h, refresh tokens = 365 days.
- YouTube: no OAuth needed for public data — `YOUTUBE_API_KEY` secret.
- Rate limits: Meta 200 calls/hour/user, TikTok 10 QPS. Cron loops with 500ms delay between accounts.

## What I need from you before I start coding

1. Confirm you want to start with the **Meta App setup guide first** (Phase 1) — nothing else works until that's done.
2. YouTube: I'll need a **`YOUTUBE_API_KEY`** from Google Cloud Console (Data API v3 enabled). Free tier is fine. Should I request it now via secure form?
3. Client-facing SMM dashboard: does "the client" mean the existing `clients` table (people who buy design work), or is this a separate group of "SMM clients" you manage? This affects the auth model — SMM clients may need their own login.

Once you answer #3 and confirm #1, I'll paste the Meta guide, request secrets, then start building bottom-up: schema → OAuth callbacks → cron → dashboards.
