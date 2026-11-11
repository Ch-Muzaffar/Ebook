/**
 * Reports which settings are present in .env.local — WITHOUT printing their values.
 *   node scripts/check-env.mjs
 */
import { existsSync, readFileSync } from "node:fs";

const GROUPS = {
  "Phase 5 — Supabase (required)": ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL", "ADMIN_EMAIL", "REVALIDATE_SECRET"],
  "Phase 6 — Lemon Squeezy": ["LEMONSQUEEZY_API_KEY", "LEMONSQUEEZY_STORE_ID", "LEMONSQUEEZY_WEBHOOK_SECRET", "LEMONSQUEEZY_VARIANT_ID", "LEMONSQUEEZY_TEST_MODE"],
  "Phase 6 — Resend (email)": ["RESEND_API_KEY", "EMAIL_FROM"],
};

if (!existsSync(".env.local")) {
  console.log(".env.local does not exist yet.");
  process.exit(1);
}
const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}

let missingRequired = 0;
for (const [group, keys] of Object.entries(GROUPS)) {
  console.log(`\n${group}`);
  for (const k of keys) {
    const v = env[k] ?? "";
    if (!v && group.includes("required")) missingRequired++;
    let note = "";
    if (v && (k === "EMAIL_FROM" ? /["']/ : /["'\s]/).test(v)) note = "  ⚠ contains quotes or spaces — remove them";
    if (k === "LEMONSQUEEZY_STORE_ID" && v && !/^\d+$/.test(v)) note = "  ⚠ should be a number only (e.g. 12345)";
    if (k === "LEMONSQUEEZY_WEBHOOK_SECRET" && v && (v.length < 16 || v.length > 40)) note = "  ⚠ must be 16–40 random characters (Lemon Squeezy's limit is 40)";
    if (k === "EMAIL_FROM" && v && !/@/.test(v)) note = "  ⚠ should look like: The Library <books@yourdomain.com>";
    console.log(`  ${k.padEnd(32)} ${v ? `set (${v.length} chars)` : "MISSING"}${note}`);
  }
}
process.exit(missingRequired ? 1 : 0);
