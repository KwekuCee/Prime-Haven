import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "ph_chunk_reload_at";

// After a new deploy, the old index chunk points at hashed files that no longer
// exist. Retry once, then force a single reload to pick up the fresh manifest.
export function lazyWithReload<T extends ComponentType<never>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      try {
        return await factory();
      } catch (retryError) {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
        if (Date.now() - last > 10_000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
          // Never resolves; the page is reloading.
          return await new Promise<{ default: T }>(() => {});
        }
        throw retryError;
      }
    }
  });
}
