/**
 * One-command end-to-end test run against the live Supabase project — data-safe.
 *
 *   npm run test:e2e                     (all checks)
 *   node scripts/e2e.mjs store-check     (selected checks)
 *
 * Every check creates its own qa-* records and temporary qa-*@example.test users, tests against
 * those, and deletes them afterwards (also on failure). Your real books, articles, settings,
 * customers and subscribers are never modified. The test build goes to .next-test, so your own
 * .next build is untouched. Requires .env.local (Supabase keys, DATABASE_URL, REVALIDATE_SECRET).
 */
import { spawn, spawnSync } from "node:child_process";
import { openSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

// The payment check needs a Lemon Squeezy variant id. Until the real one is configured, the TEST
// server uses a stand-in (simulated webhooks only — no real checkout is created by the tests).
const fileEnv = Object.fromEntries(
  (await import("node:fs")).readFileSync(".env.local", "utf8").split(/\r?\n/).map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]),
);
const variant = process.env.LEMONSQUEEZY_VARIANT_ID || fileEnv.LEMONSQUEEZY_VARIANT_ID || "999999";
const env = { ...process.env, NEXT_DIST_DIR: ".next-test", NEXT_TELEMETRY_DISABLED: "1", LEMONSQUEEZY_VARIANT_ID: variant, LEMONSQUEEZY_TEST_MODE: "true" };
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const shell = process.platform === "win32";
const ALL = ["rls-check", "auth-check", "store-check", "payment-check", "blog-check", "admin-check", "scene-check", "visual-check", "seo-check", "design-check"];
const selected = process.argv.slice(2).filter((a) => ALL.includes(a));
const summary = [];
let server;

const stop = () => {
  if (process.platform === "win32" && server?.pid) spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  else server?.kill();
};
process.on("SIGINT", () => {
  stop();
  spawnSync(process.execPath, ["-e", "import('./scripts/lib/qa-content.mjs').then(m=>m.cleanupQa()).then(()=>import('./scripts/lib/qa-users.mjs')).then(m=>m.deleteQaUsers())"], { stdio: "inherit" });
  process.exit(130);
});

try {
  console.log("• Applying database migrations (if any)…");
  if (spawnSync(process.execPath, ["scripts/db/migrate.mjs"], { stdio: "inherit" }).status !== 0) throw new Error("Migrations failed");

  console.log("• Building test bundle (.next-test)…");
  if (spawnSync(npx, ["next", "build"], { env, stdio: "inherit", shell }).status !== 0) throw new Error("Build failed");

  // Server output goes to .next-test/server.log for diagnosing failures.
  const log = openSync(".next-test/server.log", "w");
  server = spawn(npx, ["next", "start", "-p", "3100"], { env, stdio: ["ignore", log, log], shell });
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch("http://localhost:3100/")).ok) break;
    } catch {}
    await sleep(500);
  }

  for (const script of selected.length ? selected : ALL) {
    console.log(`\n• Running ${script}…`);
    const file = script === "rls-check" ? "scripts/db/rls-check.mjs" : `scripts/${script}.mjs`;
    const r = spawnSync(process.execPath, [file, "http://localhost:3100"], { stdio: "inherit", env: { ...process.env, QA_BASE_URL: "http://localhost:3100", LEMONSQUEEZY_VARIANT_ID: variant } });
    summary.push(`${r.status === 0 ? "PASS" : "FAIL"}  ${script}`);
  }
} catch (e) {
  summary.push(`FAIL  runner: ${e.message}`);
} finally {
  stop();
}
console.log(`\n${summary.join("\n")}`);
process.exit(summary.every((s) => s.startsWith("PASS")) ? 0 : 1);
