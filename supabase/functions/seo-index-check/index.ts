import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GSC_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITE_ORIGIN = "https://primehaven.tech";
const MAX_URLS = 25;
const MIN_MINUTES_BETWEEN_RUNS = 5;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const gscHeaders = () => ({
  Authorization: `Bearer ${LOVABLE_API_KEY}`,
  "X-Connection-Api-Key": GSC_KEY as string,
  "Content-Type": "application/json",
});

type SiteEntry = { siteUrl: string; permissionLevel?: string };

function coversTarget(siteUrl: string, target: URL) {
  if (siteUrl.startsWith("sc-domain:")) {
    const domain = siteUrl.slice("sc-domain:".length).toLowerCase();
    const host = target.hostname.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  }
  try {
    return target.href.startsWith(new URL(siteUrl).href);
  } catch {
    return false;
  }
}

async function listVerifiedProperties(target: URL) {
  const res = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers: gscHeaders() });
  if (!res.ok) {
    const details = await res.text();
    console.error(`Gateway request failed [${res.status}]: ${details}`);
    throw new Error(`Could not list Search Console properties [${res.status}]: ${details}`);
  }
  const { siteEntry = [] } = (await res.json()) as { siteEntry?: SiteEntry[] };
  return siteEntry.filter(
    (e) => e.permissionLevel !== "siteUnverifiedUser" && coversTarget(e.siteUrl, target),
  );
}

async function inspectUrl(siteUrl: string, inspectionUrl: string) {
  const res = await fetch(`${GATEWAY}/v1/urlInspection/index:inspect`, {
    method: "POST",
    headers: gscHeaders(),
    body: JSON.stringify({ inspectionUrl, siteUrl }),
  });
  if (!res.ok) {
    const details = await res.text();
    console.error(`URL inspection failed for ${inspectionUrl} [${res.status}]: ${details}`);
    return {
      url: inspectionUrl,
      state: "unknown",
      indexed: false,
      issue: `Inspection failed (${res.status})`,
      details,
    };
  }
  const data = await res.json();
  const index = data?.inspectionResult?.indexStatusResult ?? {};
  const verdict = String(index.verdict ?? "VERDICT_UNSPECIFIED");
  const coverage = String(index.coverageState ?? "Unknown");
  const indexed = verdict === "PASS";
  const fetchState = String(index.pageFetchState ?? "");
  const crawlIssue =
    fetchState && !["SUCCESSFUL", "PAGE_FETCH_STATE_UNSPECIFIED"].includes(fetchState)
      ? `Fetch problem: ${fetchState}`
      : null;
  const robotsIssue =
    index.robotsTxtState && index.robotsTxtState === "DISALLOWED" ? "Blocked by robots.txt" : null;
  const indexingIssue =
    index.indexingState && !["INDEXING_ALLOWED", "INDEXING_STATE_UNSPECIFIED"].includes(index.indexingState)
      ? `Indexing: ${index.indexingState}`
      : null;

  return {
    url: inspectionUrl,
    state: coverage,
    verdict,
    indexed,
    last_crawled: index.lastCrawlTime ?? null,
    google_canonical: index.googleCanonical ?? null,
    user_canonical: index.userCanonical ?? null,
    issue: crawlIssue ?? robotsIssue ?? indexingIssue ?? (indexed ? null : coverage),
  };
}

async function fetchSitemapUrls(sitemapUrl: string) {
  const res = await fetch(sitemapUrl, { headers: { Accept: "application/xml" } });
  if (!res.ok) throw new Error(`Sitemap fetch failed [${res.status}] for ${sitemapUrl}`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  const origin = new URL(SITE_ORIGIN).origin;
  return [...new Set(locs.filter((u) => u.startsWith(origin)))];
}

async function deploymentSignature() {
  try {
    const res = await fetch(SITE_ORIGIN, { method: "GET", cache: "no-store" });
    const etag = res.headers.get("etag");
    const modified = res.headers.get("last-modified");
    if (etag || modified) return `${etag ?? ""}|${modified ?? ""}`;
    const html = await res.text();
    // Vite emits hashed asset names, so the bundle reference changes on every publish.
    const asset = html.match(/\/assets\/[^"']+\.js/)?.[0];
    return asset ?? `len:${html.length}`;
  } catch (e) {
    console.error("Could not read deployment signature:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    if (!LOVABLE_API_KEY || !GSC_KEY) {
      return json(
        { error: "not_configured", message: "Google Search Console is not connected for this project." },
        503,
      );
    }

    const body = await req.json().catch(() => ({}));
    const force = body?.force === true;
    const requestedSite = typeof body?.site_url === "string" ? body.site_url : undefined;

    let triggeredBy: string | null = null;
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const { data } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
      triggeredBy = data?.user?.id ?? null;
    }

    const signature = await deploymentSignature();

    const { data: last } = await admin
      .from("seo_index_reports")
      .select("id, created_at, deployment_signature")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (last) {
      const ageMinutes = (Date.now() - new Date(last.created_at).getTime()) / 60000;
      if (ageMinutes < MIN_MINUTES_BETWEEN_RUNS && !force) {
        return json({ skipped: "throttled", report_id: last.id });
      }
      if (!force && signature && last.deployment_signature === signature) {
        return json({ skipped: "no_new_deployment", report_id: last.id });
      }
    }

    const target = new URL(SITE_ORIGIN);
    const properties = await listVerifiedProperties(target);
    if (properties.length === 0) {
      return json(
        {
          error: "no_verified_property",
          message: "No verified Search Console property covers this site.",
        },
        403,
      );
    }
    let siteUrl: string;
    if (requestedSite) {
      const match = properties.find((p) => p.siteUrl === requestedSite);
      if (!match) return json({ error: "invalid_property" }, 400);
      siteUrl = match.siteUrl;
    } else if (properties.length === 1) {
      siteUrl = properties[0].siteUrl;
    } else {
      return json(
        { status: "selection_required", candidates: properties.map((p) => p.siteUrl) },
        200,
      );
    }

    const sitemapUrl = `${target.origin}/sitemap.xml`;
    const urls = (await fetchSitemapUrls(sitemapUrl)).slice(0, MAX_URLS);

    // Inspect in small batches so the whole run finishes inside the function timeout.
    const pages: Record<string, unknown>[] = [];
    const BATCH = 5;
    for (let i = 0; i < urls.length; i += BATCH) {
      const batch = urls.slice(i, i + BATCH);
      pages.push(...(await Promise.all(batch.map((url) => inspectUrl(siteUrl, url)))));
    }

    const indexedCount = pages.filter((p) => p.indexed).length;
    const issues = pages.filter((p) => !p.indexed || p.issue);
    const report = {
      site_url: siteUrl,
      sitemap_url: sitemapUrl,
      deployment_signature: signature,
      total_urls: pages.length,
      indexed_count: indexedCount,
      issue_count: issues.length,
      pages,
      triggered_by: triggeredBy,
      trigger: triggeredBy ? "manual" : "automatic",
    };

    const { data: inserted, error } = await admin
      .from("seo_index_reports")
      .insert(report)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return json({ status: "ok", report_id: inserted.id, ...report });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("seo-index-check failed:", message);
    return json({ error: "check_failed", message }, 500);
  }
});
