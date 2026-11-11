/** Sends one test email to ADMIN_EMAIL through Resend (prints no secrets). */
import { loadEnv } from "./env.mjs";

const env = loadEnv();
const r = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    from: env.EMAIL_FROM,
    to: [env.ADMIN_EMAIL],
    subject: "Test email from your eBook platform",
    text: "This is a test from your website setup. If you can read this, email sending through Resend works.\n\nNo action needed.",
  }),
});
const body = await r.json().catch(() => ({}));
console.log(r.ok ? `Test email accepted by Resend (id ${body.id}) → sent to ${env.ADMIN_EMAIL.replace(/(.{2}).*(@.*)/, "$1…$2")}` : `FAILED (${r.status}): ${JSON.stringify(body)}`);
