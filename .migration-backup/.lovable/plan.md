## Welcome Toast on Homepage

Show a friendly "Welcome to Prime Haven" toast the first time a visitor lands on the homepage during a browser session. Reappears in a new session, never twice in the same one.

### Note on phone name access
Browsers cannot read the device owner's name from a phone — no web API exposes that (privacy restriction on both iOS and Android). Only a native app with contacts permission could do this. So we're going with a clean generic welcome, no name lookup.

### Behavior
- Triggers once per browser session on `/` (homepage).
- Uses `sessionStorage` flag `ph_welcomed` so it doesn't repeat on SPA navigation back to home.
- Fires ~800ms after mount so it doesn't fight the hero animation.
- Uses existing `sonner` toast (already wired in the app).

### Implementation
- Add a small `useEffect` in `src/pages/Index.tsx`:
  - Check `sessionStorage.getItem('ph_welcomed')`; if absent, call `toast()` with title "Welcome to Prime Haven 👋" and description "Premium design, built in Ghana.", then set the flag.
- No new files, no DB changes, no dependencies.
