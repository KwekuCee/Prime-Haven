const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://kbxijzsrywcwnyvtbruh.supabase.co";

module.exports = async function handler(req, res) {
  const origin = (req.headers && req.headers.origin) || "*";

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
  );
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  const pathParam = req.query && req.query.path;
  const functionPath = Array.isArray(pathParam) ? pathParam.join("/") : (pathParam || "");
  const targetUrl = `${SUPABASE_URL}/functions/v1/${functionPath}`;

  try {
    const headers = {
      Origin: "https://primehaven.tech",
    };

    if (req.headers) {
      for (const [key, val] of Object.entries(req.headers)) {
        const lower = key.toLowerCase();
        if (
          lower === "authorization" ||
          lower === "apikey" ||
          lower === "content-type" ||
          lower.startsWith("x-supabase-") ||
          lower === "x-client-info"
        ) {
          if (typeof val === "string") {
            headers[key] = val;
          }
        }
      }
    }

    const fetchOptions = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      fetchOptions.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    }

    const upstreamRes = await fetch(targetUrl, fetchOptions);
    const contentType = upstreamRes.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }
    res.statusCode = upstreamRes.status;

    const buffer = await upstreamRes.arrayBuffer();
    res.end(Buffer.from(buffer));
  } catch (err) {
    console.error("Vercel Edge proxy error:", err);
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: "edge_proxy_failed", details: (err && err.message) || String(err) }));
  }
};
