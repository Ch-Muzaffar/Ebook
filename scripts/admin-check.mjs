/**
 * Phase 5 admin features: settings, customers/roles, newsletter + subscribers, password reset UX.
 * Data-safe: temporary qa-* users/subscribers, settings snapshot restored afterwards.
 *   node scripts/admin-check.mjs [baseUrl]
 */
import { DEVICES, launch, sleep } from "./lib/browser.mjs";
import { cleanupQa, snapshotSettings } from "./lib/qa-content.mjs";
import { createUser, deleteQaUsers, qaEmail, qaPassword } from "./lib/qa-users.mjs";
import { connect } from "./db/env.mjs";
import { helpers, reporter } from "./lib/ui.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
process.env.QA_BASE_URL = BASE;
const { check, finish } = reporter();
const html = async (p) => (await fetch(BASE + p)).text();
const b = await launch({ base: BASE, port: 9345 });
const { wait, fill, click, signIn } = helpers(b);
const restoreSettings = await snapshotSettings();

try {
  await deleteQaUsers();
  await cleanupQa();
  const admin = { email: qaEmail("admin"), password: qaPassword() };
  const cust = { email: qaEmail("cust"), password: qaPassword() };
  await createUser(admin.email, admin.password, { role: "admin", name: "QA Admin" });
  await createUser(cust.email, cust.password, { name: "QA Customer" });

  // ------------------------------------------------------------ settings
  check("admin signs in", await signIn(admin.email, admin.password, "/admin/settings"));
  await wait(`document.querySelector('main form [name=brandName]')`);
  await fill("brandName", "QA Brand Name");
  await fill("tagline", "QA tagline for testing.");
  await fill("contactEmail", "qa-contact@example.test");
  await fill("social_x", "javascript:alert(1)");
  await click("main form button[type=submit]");
  check("unsafe social link rejected", await wait(`document.body.innerText.includes('must start with https://')`));
  await fill("social_x", "https://x.com/qa");
  await click("main form button[type=submit]");
  check("settings save", await wait(`document.body.innerText.includes('Settings saved')`));
  const home = await html("/");
  check("brand + tagline update across the site", home.includes("QA Brand Name") && home.includes("QA tagline for testing."));
  check("contact page shows the contact email", (await html("/contact")).includes("qa-contact@example.test"));
  check("footer shows the social link", home.includes("https://x.com/qa"));
  await restoreSettings();
  let restored = false;
  for (let i = 0; i < 10 && !restored; i++) {
    restored = !(await html("/")).includes("QA Brand Name");
    if (!restored) await sleep(2000);
  }
  check("original settings restored", restored);

  // ------------------------------------------------------------ customers
  await b.go(`/admin/customers?q=${encodeURIComponent(cust.email)}`, DEVICES.desktop, { settle: 800 });
  check("customers search finds the account", await wait(`document.querySelector('tbody')?.innerText.includes(${JSON.stringify(cust.email)})`));
  await click(`button[aria-label="Make admin: ${cust.email}"]`);
  await sleep(200);
  await b.evaluate(`[...document.querySelectorAll('tbody button')].find(x => x.textContent.trim() === 'Confirm').click(); true`);
  check("promote customer to admin", await wait(`document.querySelector('tbody')?.innerText.includes('Admin')`));
  await click(`button[aria-label="Remove admin: ${cust.email}"]`);
  await sleep(200);
  await b.evaluate(`[...document.querySelectorAll('tbody button')].find(x => x.textContent.trim() === 'Confirm').click(); true`);
  check("demote back to customer", await wait(`document.querySelector('tbody')?.innerText.includes('Customer')`));
  await b.go(`/admin/customers?q=${encodeURIComponent(admin.email)}`, DEVICES.desktop, { settle: 800 });
  check("you can't change your own role", await wait(`document.querySelector('tbody')?.innerText.includes('You') && !document.querySelector('tbody button')`));

  // ------------------------------------------------------------ newsletter
  await b.send("Network.clearBrowserCookies");
  const subEmail = qaEmail("sub");
  await b.go("/", DEVICES.desktop, { settle: 1500 });
  const subscribe = async (email) => {
    await b.evaluate(`(() => { const f = [...document.forms].find(f => f.email && f.querySelector('[name=company]')); f.scrollIntoView();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(f.email, ${JSON.stringify(email)});
      f.email.dispatchEvent(new Event('input', { bubbles: true })); f.querySelector('button[type=submit]').click(); return true; })()`);
  };
  await subscribe("not-an-email");
  check("newsletter: invalid email rejected", await wait(`document.body.innerText.includes('Please enter a valid email address.')`));
  await subscribe(subEmail);
  check("newsletter: subscribed", await wait(`document.body.innerText.includes("you're subscribed")`));
  await b.go("/", DEVICES.desktop, { settle: 1500 });
  await subscribe(subEmail.toUpperCase());
  check("newsletter: duplicate gets the same friendly reply", await wait(`document.body.innerText.includes("you're subscribed")`));
  const db = await connect();
  const { rows } = await db.query("select count(*)::int n, max(unsubscribe_token::text) t from subscribers where lower(email) = $1", [subEmail]);
  await db.end();
  check("stored once, lower-cased", rows[0].n === 1);

  check("admin signs in again", await signIn(admin.email, admin.password, "/admin/subscribers"));
  check("subscriber listed in admin", await wait(`document.querySelector('tbody')?.innerText.includes(${JSON.stringify(subEmail)})`));
  const csv = await b.evaluate(`fetch('/admin/subscribers/export').then(r => r.text())`);
  check("CSV export contains the subscriber", csv.startsWith("email,source,subscribed_at") && csv.includes(subEmail));
  const anonCsv = await fetch(`${BASE}/admin/subscribers/export`, { redirect: "manual" });
  check("CSV export refused when signed out", anonCsv.status >= 300 && anonCsv.status < 500 && !(await anonCsv.text()).includes(subEmail), anonCsv.status);

  await b.send("Network.clearBrowserCookies");
  await b.go(`/newsletter/unsubscribe?token=${rows[0].t}`, DEVICES.desktop, { settle: 800 });
  await click("main form button[type=submit]");
  check("unsubscribe via link (confirm button)", await wait(`document.body.innerText.includes("You've been unsubscribed")`));
  await b.go(`/newsletter/unsubscribe?token=00000000-0000-4000-8000-000000000000`, DEVICES.desktop, { settle: 800 });
  await click("main form button[type=submit]");
  check("bogus unsubscribe token handled", await wait(`document.body.innerText.includes('invalid')`));

  // ------------------------------------------------------------ password reset UX
  await b.go("/forgot-password", DEVICES.desktop, { settle: 800 });
  await fill("email", "qa-nobody@example.test");
  await click("main form button[type=submit]");
  check("reset request gives the same answer for unknown emails", await wait(`document.body.innerText.includes("If an account exists")`));
  await b.go("/auth/callback?code=bogus", DEVICES.desktop, { settle: 800 });
  check("invalid reset link → friendly 'expired' message", await wait(`location.pathname === '/forgot-password' && document.body.innerText.includes('expired')`));
  await b.shot("docs/screenshots/phase5-forgot-password.png");
} catch (e) {
  check("script error", false, String(e));
} finally {
  await restoreSettings().catch(() => {});
  await cleanupQa().catch(() => {});
  await deleteQaUsers().catch(() => {});
  b.close();
}
process.exit(finish(b.consoleErrors));
