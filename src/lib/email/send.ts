import "server-only";

import { resilientFetch } from "@/lib/supabase/fetch";

/** Escape text for safe inclusion in HTML emails. */
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Send an email through Resend. `idempotencyKey` prevents duplicates if the same event is
 * processed twice (e.g. a webhook retry). Returns false instead of throwing — callers decide.
 */
export async function sendEmail(input: { to: string; subject: string; html: string; text: string; idempotencyKey?: string }) {
  // Reserved test domains can never receive mail; sending would only bounce and hurt the
  // sending domain's reputation. Automated tests use these addresses.
  if (/@(example\.(test|com|org|net)|[^@]+\.test)$/i.test(input.to)) {
    console.info(`email: skipped test address (${input.subject})`);
    return true;
  }
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.error("email: RESEND_API_KEY / EMAIL_FROM not configured");
    return false;
  }
  try {
    const res = await resilientFetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html, text: input.text }),
    });
    if (!res.ok) console.error("email: Resend refused", res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (e) {
    console.error("email: send failed", e);
    return false;
  }
}

/** Minimal, brand-consistent HTML layout (inline styles for email clients). */
export function layout(brand: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#f8f5ef;font-family:Inter,Segoe UI,Arial,sans-serif;color:#252522">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #ddd5c7;border-radius:12px">
<tr><td style="padding:28px 32px;border-bottom:1px solid #eae3d8;font-family:Georgia,'Times New Roman',serif;font-size:20px">
<span style="display:inline-block;width:3px;height:18px;background:#b49a67;vertical-align:middle;margin-right:10px"></span>${esc(brand)}</td></tr>
<tr><td style="padding:28px 32px;font-size:15px;line-height:1.6">${bodyHtml}</td></tr>
</table>
<p style="font-size:12px;color:#5e5a52;margin-top:16px">You received this email because of activity on your ${esc(brand)} account.</p>
</td></tr></table></body></html>`;
}

export function button(href: string, label: string) {
  return `<a href="${esc(href)}" style="display:inline-block;background:#252522;color:#f8f5ef;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600">${esc(label)}</a>`;
}
