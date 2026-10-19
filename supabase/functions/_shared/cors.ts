// Shared origin lockdown for browser-called Edge Functions.
// Requests without an Origin header (server-to-server, webhooks, cron) pass through.
// Browser requests from origins outside the allowlist are rejected with 403.

const EXACT = new Set([
  "https://primehaven.tech",
  "https://www.primehaven.tech",
  "https://we1234456677.lovable.app",
]);

const PATTERNS = [
  /^https:\/\/[a-z0-9-]+--99cdecd3-e271-46db-8f34-a596c4a5a6f5\.lovable\.app$/,
  /^https:\/\/99cdecd3-e271-46db-8f34-a596c4a5a6f5\.lovableproject\.com$/,
  /^https:\/\/[a-z0-9-]+\.([a-z0-9-]+\.)?run\.app$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/, // Allow Vercel preview & production domains
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

export const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return true;
  return EXACT.has(origin) || PATTERNS.some((p) => p.test(origin));
};

type Handler = (req: Request) => Response | Promise<Response>;

export const withCors = (handler: Handler): Handler => async (req: Request) => {
  const origin = req.headers.get("origin");

  if (!isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin || "*",
        Vary: "Origin",
      },
    });
  }

  // Preflight handling inside withCors wrapper if method is OPTIONS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
        Vary: "Origin",
      },
    });
  }

  const res = await handler(req);
  if (origin) {
    const headers = new Headers(res.headers);
    headers.set("Access-Control-Allow-Origin", origin);
    headers.append("Vary", "Origin");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  }
  return res;
};

