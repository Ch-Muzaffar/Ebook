/**
 * Verifies Row Level Security as an anonymous visitor (publishable key only).
 * Expectation: only published books, live articles, categories and settings are visible;
 * drafts, files, subscribers and profiles are not; writes are refused.
 *   node scripts/db/rls-check.mjs
 */
import { connect, loadEnv } from "./env.mjs";

const env = loadEnv();
const api = (path, init = {}) =>
  fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "Content-Type": "application/json", Prefer: "return=representation", ...init.headers },
  });
const rows = async (path) => {
  const r = await api(path);
  return r.ok ? (await r.json()).length : `HTTP ${r.status}`;
};

const db = await connect();
const truth = (await db.query(`select
  (select count(*) from products where status='published')::int as pub_books,
  (select count(*) from products)::int as all_books,
  (select count(*) from articles where status <> 'draft' and publish_at <= now())::int as live_articles,
  (select count(*) from articles)::int as all_articles,
  (select count(*) from categories)::int as cats`)).rows[0];
await db.end();

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

check(`anon sees only published books (${truth.pub_books} of ${truth.all_books})`, (await rows("products?select=id")) === truth.pub_books, await rows("products?select=id"));
check("anon cannot see draft books", (await rows("products?select=id&status=eq.draft")) === 0);
check(`anon sees only live articles (${truth.live_articles} of ${truth.all_articles})`, (await rows("articles?select=id")) === truth.live_articles, await rows("articles?select=id"));
check("anon sees all categories", (await rows("categories?select=id")) === truth.cats);
check("anon sees site settings", (await rows("site_settings?select=brand_name")) === 1);
check("anon cannot read profiles", (await rows("profiles?select=id")) === 0);
check("anon cannot read subscribers", (await rows("subscribers?select=id")) === 0);
check("anon cannot read eBook file records", (await rows("product_files?select=product_id")) === 0);

const ins = await api("categories", { method: "POST", body: JSON.stringify({ slug: "rls-test", name: "RLS test" }) });
check("anon cannot create categories", !ins.ok, ins.status);
const upd = await api("products?slug=neq.__none__", { method: "PATCH", body: JSON.stringify({ price_cents: 1 }) });
check("anon cannot change prices", !upd.ok || (await upd.json()).length === 0, upd.status);
const sub = await api("subscribers", { method: "POST", body: JSON.stringify({ email: "rls@example.com" }) });
check("anon cannot write subscribers directly", !sub.ok, sub.status);
const rpc = await api("rpc/is_admin", { method: "POST", body: "{}" });
check("is_admin() is false for anonymous", rpc.ok && (await rpc.json()) === false);

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${!r.ok && r.detail !== undefined ? `  → ${r.detail}` : ""}`);
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
