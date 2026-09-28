// Shared Resend email sender and consistent branding — server-only.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

export const FROM_ADDRESS = "Prime Haven <team@primehaven.tech>";
export const APPLICATIONS_ADDRESS = "Prime Haven <applications@primehaven.tech>";
export const INFO_ADDRESS = "Prime Haven <info@primehaven.tech>";
export const SUPPORT_ADDRESS = "Prime Haven <support@primehaven.tech>";
export const OWNER_EMAIL = "primehaven26@gmail.com";

const LOGO_URL = "https://primehaven.tech/logo-512.png";

function brandedHtml(html: string): string {
  // Preserve templates already carrying a Prime Haven logo; add the current icon
  // to every other outgoing HTML message without changing its original layout.
  if (/<img\b[^>]*\bsrc=["'][^"']*(?:prime-haven-logo|logo-512)[^"']*["']/i.test(html)) return html;
  const header = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111111;"><tr><td align="center" style="padding:20px;"><img src="${LOGO_URL}" alt="Prime Haven" width="64" height="64" style="display:block;width:64px;height:64px;border:0;" /></td></tr></table>`;
  return /<body\b[^>]*>/i.test(html)
    ? html.replace(/(<body\b[^>]*>)/i, `$1${header}`)
    : `${header}${html}`;
}

export interface SendEmailOptions {
  from?: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from || FROM_ADDRESS,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html ? brandedHtml(opts.html) : undefined,
      text: opts.text,
      reply_to: opts.replyTo,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend send failed [${res.status}]: ${body}`);
  }
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

/** Best-effort alert to the owner inbox. Never throws. */
export async function alertOwner(from: string, title: string, fields: Record<string, unknown>, link?: string): Promise<boolean> {
  try {
    const rows = Object.entries(fields)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `<tr><td style="color:#888;padding:6px 12px 6px 0;vertical-align:top;">${esc(k)}</td><td style="color:#111;padding:6px 0;">${esc(v).slice(0, 2000)}</td></tr>`)
      .join("");
    const html = `<!DOCTYPE html><html><body style="margin:0;background:#f6f3ee;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px;"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;"><tr><td style="padding:24px;"><h2 style="margin:0 0 16px;color:#fe4c18;">${esc(title)}</h2><table cellpadding="0" cellspacing="0" style="font-size:14px;">${rows}</table>${link ? `<p style="margin-top:20px;"><a href="https://primehaven.tech${esc(link)}" style="color:#fe4c18;">Open in dashboard</a></p>` : ""}</td></tr></table></td></tr></table></body></html>`;
    await sendEmail({ from, to: OWNER_EMAIL, subject: `[Prime Haven] ${title}`, html });
    return true;
  } catch (e) {
    console.error("owner alert failed:", e);
    return false;
  }
}
