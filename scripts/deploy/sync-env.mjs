/**
 * Copies production settings from .env.local into the linked Vercel project — values are piped
 * straight to the Vercel CLI and NEVER printed. Run after `npx vercel link`.
 *
 *   node scripts/deploy/sync-env.mjs            (production)
 *   node scripts/deploy/sync-env.mjs preview    (preview deployments)
 *
 * Local-only values (DATABASE_URL is used only by scripts/db/*) are not uploaded.
 * NEXT_PUBLIC_SITE_URL is set to the real domain for production.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const target = process.argv[2] === "preview" ? "preview" : "production";
const SITE = process.env.SITE_URL || "https://digitaltraffic.blog";

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_EMAIL",
  "REVALIDATE_SECRET",
  "LEMONSQUEEZY_API_KEY",
  "LEMONSQUEEZY_STORE_ID",
  "LEMONSQUEEZY_WEBHOOK_SECRET",
  "LEMONSQUEEZY_VARIANT_ID",
  "LEMONSQUEEZY_TEST_MODE",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "NEXT_PUBLIC_GTM_ID",
  "GOOGLE_SITE_VERIFICATION",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];
const REQUIRED = KEYS.slice(0, 12);

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
env.NEXT_PUBLIC_SITE_URL = target === "production" ? SITE : "";

const missing = REQUIRED.filter((k) => !env[k]);
if (missing.length) {
  console.error(`Missing in .env.local: ${missing.join(", ")}`);
  process.exit(1);
}

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const token = process.env.VERCEL_TOKEN || env.VERCEL_TOKEN;
let failed = 0;
for (const key of ["NEXT_PUBLIC_SITE_URL", ...KEYS]) {
  const value = env[key];
  if (!value) {
    console.log(`  skip  ${key} (not set)`);
    continue;
  }
  // `env add --force` creates or replaces; the value goes in on stdin, never on the command line.
  const args = ["vercel", "env", "add", key, target, "--force", ...(token ? ["--token", token] : [])];
  const r = spawnSync(npx, args, { input: value, encoding: "utf8", shell: process.platform === "win32" });
  const ok = r.status === 0;
  if (!ok) failed++;
  console.log(`  ${ok ? "set " : "FAIL"}  ${key}${ok ? "" : `  → ${(r.stderr || r.stdout).split("\n").filter(Boolean).pop()}`}`);
}
console.log(failed ? `\n${failed} variable(s) failed.` : `\nAll ${target} variables set. Redeploy for them to take effect.`);
process.exit(failed ? 1 : 0);
