/**
 * Phase 5 authentication + authorisation check (data-safe: uses temporary qa-* users, deleted after).
 *   node scripts/auth-check.mjs [baseUrl]      (server must be running, e.g. npx next start -p 3100)
 */
import { DEVICES, launch, sleep } from "./lib/browser.mjs";
import { accessToken, createUser, deleteQaUsers, env, qaEmail, qaPassword } from "./lib/qa-users.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const results = [];
const check = (name, pass, detail) => results.push({ pass: !!pass, name, detail });
const b = await launch({ base: BASE, port: 9343 });
const wait = (expr, ms = 20000) =>
  b.evaluate(`new Promise(res => { const s = Date.now(); const t = () => { let v; try { v = (${expr}); } catch {}
    if (v || Date.now() - s > ${ms}) res(!!v); else setTimeout(t, 150); }; t(); })`);
const fill = (name, value) =>
  b.evaluate(`(() => { const el = document.querySelector('form [name="${name}"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
const submit = () => b.evaluate(`document.querySelector('main form button[type=submit]').click(); true`);
const path = () => b.evaluate("location.pathname");
const text = () => b.evaluate("document.body.innerText");
const clearCookies = () => b.send("Network.clearBrowserCookies");

const customer = { email: qaEmail("customer"), password: qaPassword() };
const adminUser = { email: qaEmail("admin"), password: qaPassword() };

try {
  await deleteQaUsers(); // leftovers from an interrupted run

  // ---------------------------------------------------------------- protection when signed out
  await b.go("/dashboard", DEVICES.desktop, { settle: 500 });
  check("signed-out /dashboard → /login", (await path()) === "/login");
  await b.go("/admin/products", DEVICES.desktop, { settle: 500 });
  check("signed-out /admin → /login with next", (await path()) === "/login" && (await b.evaluate("location.search")).includes("next=%2Fadmin%2Fproducts"));

  // ---------------------------------------------------------------- registration
  await b.go("/register", DEVICES.desktop, { settle: 800 });
  await fill("name", "QA Customer");
  await fill("email", customer.email);
  await fill("password", "short");
  await submit();
  check("weak password rejected", await wait(`document.body.innerText.includes('at least 8 characters')`));

  await fill("password", customer.password);
  await fill("email", (env.ADMIN_EMAIL ?? "").toUpperCase());
  await submit();
  check("owner's admin email cannot be registered", await wait(`document.body.innerText.includes("can't be used to register")`));

  await fill("email", customer.email);
  await fill("password", customer.password);
  await submit();
  check("register (no email confirmation) → signed in on /dashboard", await wait(`location.pathname === '/dashboard' && document.body.innerText.includes('Hello, QA')`));
  check("header shows account state after sign-in", await wait(`document.querySelector('a[aria-label="Your account"]')`));

  await b.go("/admin", DEVICES.desktop, { settle: 800 });
  check("customer cannot open /admin (redirected)", (await path()) === "/dashboard" && (await text()).includes("administrators only"));

  // A customer calling an admin-only database write directly (bypassing the UI) is refused by RLS.
  const ctoken = await accessToken(customer.email, customer.password);
  const auth = { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${ctoken}`, "Content-Type": "application/json", Prefer: "return=representation" };
  const ins = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/categories`, { method: "POST", headers: auth, body: JSON.stringify({ slug: "qa-hack", name: "QA hack" }) });
  check("customer cannot write content via the API (RLS)", !ins.ok, ins.status);
  const promote = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(customer.email)}`, { method: "PATCH", headers: auth, body: JSON.stringify({ role: "admin" }) });
  check("customer cannot promote themselves to admin", !promote.ok, promote.status);
  const others = await (await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=email`, { headers: auth })).json();
  check("customer sees only their own profile", Array.isArray(others) && others.length === 1 && others[0].email === customer.email, others.length);
  const drafts = await (await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products?select=id&status=eq.draft`, { headers: auth })).json();
  check("customer cannot see draft books", Array.isArray(drafts) && drafts.length === 0);

  // Profile name update (allowed column)
  await b.go("/dashboard", DEVICES.desktop, { settle: 800 });
  await wait(`[...document.querySelectorAll('form')].some(f => f.querySelector('[name=name]'))`, 30000);
  await b.evaluate(`(() => { const f = [...document.querySelectorAll('form')].find(f => f.querySelector('[name=name]'));
    const el = f.querySelector('[name=name]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'QA Renamed');
    el.dispatchEvent(new Event('input', { bubbles: true })); f.querySelector('button[type=submit]').click(); return true; })()`);
  check("customer can update their name", await wait(`document.body.innerText.includes('Saved.')`));

  // Sign out
  await b.evaluate(`[...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Sign out').click(); true`);
  check("sign out → home, signed out", await wait(`location.pathname === '/'`) && (await wait(`document.querySelector('a[aria-label="Sign in"]')`)));
  await b.go("/dashboard", DEVICES.desktop, { settle: 500 });
  check("after sign-out /dashboard is protected again", (await path()) === "/login");

  // ---------------------------------------------------------------- login
  await b.go("/login", DEVICES.desktop, { settle: 800 });
  await fill("email", customer.email);
  await fill("password", "wrong-password-1");
  await submit();
  check("wrong password → generic error", await wait(`document.body.innerText.includes('Email or password is incorrect.')`));
  await fill("password", customer.password);
  await submit();
  check("correct password → /dashboard", await wait(`location.pathname === '/dashboard'`));
  await b.go("/login", DEVICES.desktop, { settle: 500 });
  check("signed-in user visiting /login → /dashboard", (await path()) === "/dashboard");

  // ---------------------------------------------------------------- admin
  await clearCookies();
  await createUser(adminUser.email, adminUser.password, { role: "admin", name: "QA Admin" });
  await b.go("/login?next=%2Fadmin%2Fproducts", DEVICES.desktop, { settle: 800 });
  await fill("email", adminUser.email);
  await fill("password", adminUser.password);
  await submit();
  check("admin sign-in honours ?next → /admin/products", await wait(`location.pathname === '/admin/products' && document.querySelector('tbody tr')`));
  check("admin header shows signed-in email + sign out", await wait(`document.querySelector('header').innerText.includes(${JSON.stringify(adminUser.email)}) && [...document.querySelectorAll('header button')].some(x => x.textContent.trim() === 'Sign out')`));
  await b.go("/admin", DEVICES.desktop, { settle: 800 });
  check("admin overview loads", await wait(`document.body.innerText.includes('Books published')`));

  // open-redirect attempt
  await clearCookies();
  await b.go("/login?next=%2F%2Fevil.example", DEVICES.desktop, { settle: 800 });
  await fill("email", adminUser.email);
  await fill("password", adminUser.password);
  await submit();
  await sleep(4000);
  check("?next=//evil.example does not leave the site", (await b.evaluate("location.host")) === new URL(BASE).host, await b.evaluate("location.href"));
} catch (e) {
  check("script error", false, String(e));
} finally {
  const removed = await deleteQaUsers();
  check(`cleanup: temporary users deleted (${removed})`, removed >= 1);
  b.close();
}

const errors = b.consoleErrors.filter((e) => !/40[134]|THREE\.Clock/.test(e));
check("no unexpected console errors", errors.length === 0, errors);
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${!r.pass && r.detail !== undefined ? `  → ${JSON.stringify(r.detail)}` : ""}`);
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`);
process.exit(results.every((r) => r.pass) ? 0 : 1);
