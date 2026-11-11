/**
 * Applies supabase/migrations/*.sql in order, each in a transaction, once.
 * Tracks applied files in app_private.migrations (a schema the Supabase API does not expose).
 *   node scripts/db/migrate.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { connect } from "./env.mjs";

const db = await connect();
await db.query("create schema if not exists app_private");
await db.query("create table if not exists app_private.migrations (name text primary key, applied_at timestamptz not null default now())");
const applied = new Set((await db.query("select name from app_private.migrations")).rows.map((r) => r.name));

const files = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
let ran = 0;
for (const f of files) {
  if (applied.has(f)) continue;
  process.stdout.write(`applying ${f} … `);
  try {
    await db.query("begin");
    await db.query(readFileSync(`supabase/migrations/${f}`, "utf8"));
    await db.query("insert into app_private.migrations (name) values ($1)", [f]);
    await db.query("commit");
    console.log("ok");
    ran++;
  } catch (e) {
    await db.query("rollback");
    console.log(`FAILED\n  ${e.message}${e.position ? ` (at character ${e.position})` : ""}`);
    await db.end();
    process.exit(1);
  }
}
console.log(ran ? `${ran} migration(s) applied.` : "Database already up to date.");
await db.end();
