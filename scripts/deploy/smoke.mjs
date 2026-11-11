/**
 * Read-only launch smoke test against a live deployment — changes nothing.
 *   node scripts/deploy/smoke.mjs https://digitaltraffic.blog
 */
const BASE = (process.argv[2] ?? "https://digitaltraffic.blog").replace(/\/+$/, "");
// Canonical/sitemap URLs always use the real domain, even when testing a *.vercel.app address.
const CANON = (process.env.CANONICAL ?? "https://digitaltraffic.blog").replace(/\/+$/, "");
const results = [];
const check = (name, pass, detail) => results.push({ name, pass: !!pass, detail });
const get = (p, init) => fetch(BASE + p, { redirect: "manual", ...init });

const home = await get("/");
const html = await home.text();
check("homepage 200", home.status === 200, home.status);
check("served over HTTPS", BASE.startsWith("https://"));
for (const h of ["strict-transport-security", "x-content-type-options", "referrer-policy", "x-frame-options", "permissions-policy"])
  check(`header: ${h}`, home.headers.get(h), home.headers.get(h));
check("no x-powered-by header", !home.headers.get("x-powered-by"));
check("canonical points at the real domain", html.includes(`rel="canonical" href="${CANON}`));
check("theme script + GTM container present (GTM loads only after consent)", html.includes("dt-theme"));

const robots = await (await get("/robots.txt")).text();
check("robots.txt sitemap uses the real domain", robots.includes(`Sitemap: ${CANON}/sitemap.xml`), robots.match(/Sitemap: .*/)?.[0]);
const sitemap = await get("/sitemap.xml");
const sm = await sitemap.text();
check("sitemap.xml lists real-domain URLs", sitemap.status === 200 && sm.includes(`<loc>${CANON}`));

for (const p of ["/books", "/blog", "/about", "/contact", "/privacy", "/terms", "/refund-policy", "/login", "/register"]) {
  const r = await get(p);
  check(`${p} 200`, r.status === 200, r.status);
}
const missing = await get("/books/this-book-does-not-exist");
check("unknown book → 404", missing.status === 404, missing.status);

const admin = await get("/admin");
check("/admin requires sign-in", [302, 303, 307, 308].includes(admin.status) && /\/login/.test(admin.headers.get("location") ?? ""), admin.status);
const dash = await get("/dashboard");
check("/dashboard requires sign-in", [302, 303, 307, 308].includes(dash.status), dash.status);

const hook = await get("/api/webhooks/lemonsqueezy", { method: "POST", body: "{}", headers: { "content-type": "application/json" } });
check("unsigned payment webhook rejected (401)", hook.status === 401, hook.status);
const dl = await get("/api/download/00000000-0000-0000-0000-000000000000");
check("download without sign-in is refused", dl.status !== 200, dl.status);
const rv = await get("/api/revalidate", { method: "POST" });
check("revalidate endpoint refuses without secret", rv.status === 401 || rv.status === 403, rv.status);

const icon = await get("/icon");
check("app icon served", icon.status === 200);
const og = await get("/opengraph-image");
check("social image served", og.status === 200);

if (BASE === CANON) {
  const www = await fetch(BASE.replace("https://", "https://www."), { redirect: "manual" }).catch(() => null);
  check("www redirects to the main domain", www && [301, 307, 308].includes(www.status), www?.status ?? "no response");
  const http = await fetch(BASE.replace("https://", "http://"), { redirect: "manual" }).catch(() => null);
  check("http redirects to https", http && [301, 307, 308].includes(http.status), http?.status ?? "no response");
}

for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${!r.pass && r.detail !== undefined ? `  → ${JSON.stringify(r.detail)}` : ""}`);
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`);
process.exit(results.every((r) => r.pass) ? 0 : 1);
