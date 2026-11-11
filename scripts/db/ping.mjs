/** Connectivity check for Supabase: database, anon key, service key. Prints no secrets. */
import { connect, loadEnv } from "./env.mjs";

const env = loadEnv();
try {
  const db = await connect();
  const v = await db.query("select current_setting('server_version') as v, current_user as u");
  const t = await db.query("select table_name from information_schema.tables where table_schema = 'public' order by 1");
  const b = await db.query("select id, public from storage.buckets order by 1");
  const users = await db.query("select count(*)::int as n from auth.users");
  console.log(`database: OK (Postgres ${v.rows[0].v}, user ${v.rows[0].u})`);
  console.log(`public tables: ${t.rows.map((r) => r.table_name).join(", ") || "(none)"}`);
  console.log(`storage buckets: ${b.rows.map((r) => `${r.id}${r.public ? " (public)" : ""}`).join(", ") || "(none)"}`);
  console.log(`auth users: ${users.rows[0].n}`);
  await db.end();
} catch (e) {
  console.log(`database: FAILED — ${e.message}`);
}

for (const [label, key] of [["anon key", env.NEXT_PUBLIC_SUPABASE_ANON_KEY], ["service key", env.SUPABASE_SERVICE_ROLE_KEY]]) {
  try {
    const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: key } });
    const s = await r.json();
    console.log(`${label}: ${r.ok ? "OK" : `FAILED (${r.status})`}${r.ok ? ` — email signups ${s.disable_signup ? "DISABLED" : "enabled"}, auto-confirm ${s.mailer_autoconfirm ? "on" : "off"}` : ""}`);
  } catch (e) {
    console.log(`${label}: FAILED — ${e.message}`);
  }
}
try {
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?per_page=1`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  console.log(`service key admin access: ${r.ok ? "OK" : `FAILED (${r.status})`}`);
} catch (e) {
  console.log(`service key admin access: FAILED — ${e.message}`);
}
console.log(`admin email looks valid: ${/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.ADMIN_EMAIL ?? "")}`);
