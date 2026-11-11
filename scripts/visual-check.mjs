/**
 * Dev-only visual + responsive check.
 *  - full-page screenshots at real device sizes (docs/screenshots/)
 *  - horizontal-overflow check on every route at phone, tablet and desktop widths
 *  - mobile menu, card focus ring and newsletter validation smoke tests
 *
 * Usage: npm run build && npx next start -p 3100, then  node scripts/visual-check.mjs [baseUrl]
 */
import { mkdirSync } from "node:fs";
import { DEVICES, launch, sleep } from "./lib/browser.mjs";
import { cleanupQa, seedQa } from "./lib/qa-content.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = "docs/screenshots";
const ROUTES = ["/", "/books", "/books/qa-book-alpha", "/cart", "/checkout", "/blog", "/blog/qa-article-live", "/blog/category/qa-test-category", "/forgot-password",
  "/about", "/contact", "/login", "/register", "/dashboard", "/admin", "/privacy", "/terms", "/refund-policy",
  "/books/does-not-exist"];

mkdirSync(OUT, { recursive: true });
process.env.QA_BASE_URL = BASE;
await seedQa(); // pages under test use qa-* fixtures (removed at the end)
const b = await launch({ base: BASE });
const report = { overflow: [], menu: {}, cardFocus: {}, newsletter: {}, consoleErrors: b.consoleErrors };

for (const [deviceName, device] of Object.entries(DEVICES)) {
  for (const route of ROUTES) {
    await b.go(route, device);
    const o = await b.evaluate(`(() => {
      const w = document.documentElement.clientWidth;
      const offenders = [...document.querySelectorAll('body *')]
        .filter(el => el.getBoundingClientRect().right > w + 1 && getComputedStyle(el).position !== 'fixed'
          && !el.closest('[class*="overflow-x-clip"], [class*="overflow-hidden"]'))
        .slice(0, 3).map(el => el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 60));
      // innerWidth > clientWidth on a phone means the browser zoomed out to fit wide content.
      return { scrollWidth: document.documentElement.scrollWidth, clientWidth: w, innerWidth, offenders,
               zoomedOut: innerWidth > w + 1 };
    })()`);
    if (o.scrollWidth > o.clientWidth || o.offenders.length || o.zoomedOut) report.overflow.push({ deviceName, route, ...o });
  }
}

for (const [name, path, device] of [
  ["home-desktop", "/", "desktop"], ["home-phone", "/", "phone"], ["home-tablet", "/", "tablet"],
  ["book-desktop", "/books/qa-book-alpha", "desktop"], ["book-phone", "/books/qa-book-alpha", "phone"],
  ["article-phone", "/blog/qa-article-live", "phone"], ["login-phone", "/login", "phone"],
  ["notfound-desktop", "/books/does-not-exist", "desktop"],
]) {
  await b.go(path, DEVICES[device]);
  // Scroll through once so scroll-reveal sections are visible in the full-page capture.
  await b.evaluate(`(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); await new Promise(r => setTimeout(r, 900)); return true; })()`);
  await b.shot(`${OUT}/${name}.png`, { fullPage: true });
}

// Mobile menu: open → state, scroll lock, focus; Escape → closes and restores focus.
await b.go("/", DEVICES.phone);
await b.evaluate(`document.querySelector('button[aria-controls]').click()`);
await sleep(300);
report.menu.afterOpen = await b.evaluate(`(() => {
  const btn = document.querySelector('button[aria-controls]');
  const panel = document.getElementById(btn.getAttribute('aria-controls'));
  return { expanded: btn.getAttribute('aria-expanded'), panelVisible: !panel.hidden,
    panelCoversViewport: Math.round(panel.getBoundingClientRect().height) === innerHeight,
    bodyOverflow: document.body.style.overflow, focused: document.activeElement?.textContent?.trim() };
})()`);
await b.shot(`${OUT}/menu-phone.png`);
await b.key("Escape", "Escape", 27);
await sleep(400);
report.menu.afterEscape = await b.evaluate(`(() => {
  const btn = document.querySelector('button[aria-controls]');
  return { expanded: btn.getAttribute('aria-expanded'), bodyOverflow: document.body.style.overflow,
    focusReturnedToToggle: document.activeElement === btn };
})()`);

// Card focus ring: absent by default, solid after keyboard (Tab) focus.
await b.go("/books", DEVICES.desktop);
const ring = `getComputedStyle(document.querySelector('article [data-focus-ring]')).outlineStyle`;
report.cardFocus.before = await b.evaluate(ring);
for (let i = 0; i < 40; i++) {
  await b.key("Tab", "Tab", 9);
  await sleep(50);
  if (await b.evaluate(`document.activeElement === document.querySelector('article a')`)) break;
}
report.cardFocus.afterTab = await b.evaluate(ring);

// Newsletter validation.
await b.go("/", DEVICES.desktop);
report.newsletter = await b.evaluate(`(async () => {
  const form = [...document.forms].find(f => f.email);
  form.scrollIntoView();
  const input = form.email;
  const submit = () => form.querySelector('button[type=submit]').click();
  const wait = () => new Promise(r => setTimeout(r, 150));
  const err = () => document.getElementById((input.getAttribute('aria-describedby') ?? '').split(' ').find(id => id.endsWith('-error')))?.textContent;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  submit(); await wait();
  const empty = err();
  setter.call(input, 'not-an-email'); input.dispatchEvent(new Event('input', { bubbles: true })); submit(); await wait();
  const invalid = err();
  setter.call(input, 'qa-visual-' + Date.now() + '@example.test'); input.dispatchEvent(new Event('input', { bubbles: true })); submit();
  // The sign-up is saved on the server: wait (up to 30 s on slow networks) for the confirmation.
  for (let i = 0; i < 200 && !form.querySelector('[aria-live]').textContent; i++) await new Promise(r => setTimeout(r, 150));
  return { empty, invalid, ariaInvalidCleared: input.getAttribute('aria-invalid') === null, notice: form.querySelector('[aria-live]').textContent };
})()`);

console.log(JSON.stringify(report, null, 2));
b.close();
await cleanupQa();

const failures = [];
if (report.overflow.length) failures.push(`horizontal overflow on ${report.overflow.map((o) => `${o.deviceName} ${o.route}`).join(", ")}`);
if (report.menu.afterOpen?.expanded !== "true" || !report.menu.afterOpen?.panelCoversViewport || report.menu.afterOpen?.bodyOverflow !== "hidden")
  failures.push("mobile menu did not open correctly");
if (report.menu.afterEscape?.expanded !== "false" || !report.menu.afterEscape?.focusReturnedToToggle) failures.push("Escape did not close the menu / restore focus");
if (report.cardFocus.before !== "none" || report.cardFocus.afterTab !== "solid") failures.push("card focus ring wrong");
if (!report.newsletter.empty || !report.newsletter.invalid || !report.newsletter.notice) failures.push("newsletter validation");
// 401/403 = /admin refusing access (correct); 404 = the deliberate missing-page test.
const unexpected = report.consoleErrors.filter((e) => !e.includes("THREE.Clock") && !/40[134]/.test(e));
if (unexpected.length) failures.push(`console: ${unexpected.join(" | ")}`);
console.log(failures.length ? `\nFAILED:\n- ${failures.join("\n- ")}` : "\nVisual check: all assertions passed.");
process.exit(failures.length ? 1 : 0);
