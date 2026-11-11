/**
 * REAL Lemon Squeezy test-mode purchase, end to end (no real money). Data-safe: qa-* only.
 *   node scripts/live-checkout-check.mjs https://<public-address>
 * Requires: public address (tunnel) → this server, webhook registered for it, LEMONSQUEEZY_TEST_MODE=true.
 */
import { randomUUID } from "node:crypto";
import { DEVICES, launch, sleep } from "./lib/browser.mjs";
import { cleanupQa, seedQa } from "./lib/qa-content.mjs";
import { createUser, deleteQaUsers, env, qaEmail, qaPassword } from "./lib/qa-users.mjs";
import { connect } from "./db/env.mjs";
import { FILES, helpers, reporter } from "./lib/ui.mjs";

const BASE = process.argv[2];
if (!BASE?.startsWith("https://")) throw new Error("Pass the public https address");
process.env.QA_BASE_URL = "http://localhost:3100";
const KEEP_OPEN = process.argv.includes("--manual"); // leave the order for a person to pay
const { check, finish } = reporter();
const b = await launch({ base: BASE, port: 9347 });
const { wait, signIn, clickText } = helpers(b);
const db = await connect();
let orderId;

try {
  await seedQa();
  await deleteQaUsers();
  const { rows } = await db.query("select id from products where slug = 'qa-book-alpha'");
  const path = `ebook/qa-upload-${randomUUID()}.pdf`;
  await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/ebook-files/${path}`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/pdf" },
    body: Buffer.from(FILES.pdf, "base64"),
  });
  await db.query("insert into product_files (product_id, path, file_name, size_bytes, mime_type) values ($1,$2,'qa-upload-book.pdf',100,'application/pdf')", [rows[0].id, path]);

  const buyer = { email: qaEmail("live"), password: qaPassword() };
  await createUser(buyer.email, buyer.password, { name: "QA Live Buyer" });
  check("buyer signs in on the public address", await signIn(buyer.email, buyer.password, "/books"));
  await b.evaluate(`localStorage.setItem('bag:v1', JSON.stringify(['qa-book-alpha'])); true`);
  await b.go("/checkout", DEVICES.desktop, { settle: 1500 });
  await wait(`[...document.querySelectorAll('button')].some(b => /Pay \\$9\\.00 securely/.test(b.textContent))`, 60000);
  await clickText("Pay $9.00 securely");
  // Cross-site navigation tears down the page context, so poll the URL with retries.
  let host = "";
  for (let i = 0; i < 60 && !/lemonsqueezy\.com/.test(host); i++) {
    await sleep(1000);
    host = await b.evaluate("location.host").catch(() => "");
  }
  check("redirected to Lemon Squeezy hosted checkout", /lemonsqueezy\.com/.test(host), host);
  const { rows: o } = await db.query("select id, status, subtotal_cents, provider_checkout_id from orders where email = $1", [buyer.email]);
  orderId = o[0]?.id;
  check("pending order created with our price and checkout id", o[0]?.status === "pending" && o[0]?.subtotal_cents === 900 && Boolean(o[0]?.provider_checkout_id), o[0]);
  await sleep(6000);

  // ---------------------------------------------------------------- pay with the Stripe TEST card
  const click = async (x, y) => {
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"])
      await b.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
    await sleep(250);
  };
  const type = async (text) => {
    for (const ch of text) {
      await b.send("Input.dispatchKeyEvent", { type: "keyDown", text: ch, key: ch, unmodifiedText: ch });
      await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: ch });
      await sleep(40);
    }
  };
  const press = (key, code, vk) => b.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key, code, windowsVirtualKeyCode: vk }).then(() => b.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk }));
  const center = (sel) => b.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; })()`);
  const fillAt = async (sel, text) => {
    const p = await center(sel);
    await click(p.x, p.y);
    await b.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.select?.(); return true; })()`);
    await type(text);
  };

  // Card fields live in Stripe's secure iframe: click into each field by position and type.
  const frame = await center('iframe[title="Secure payment input frame"]');
  const top = await b.evaluate(`document.querySelector('iframe[title="Secure payment input frame"]').getBoundingClientRect().y`);
  const left = frame.x - frame.w / 2;
  await click(left + 150, top + 60); // card number
  await type("4242424242424242");
  await click(left + 80, top + 152); // expiry
  await type("1234");
  await click(left + 340, top + 152); // CVC
  await type("123");
  await fillAt('input[placeholder="Address line 1"]', "1 Test Street");
  await fillAt("#city", "New York");
  await fillAt("#postal_code", "10001");
  await fillAt('input[placeholder="Select a state…"]', "New York");
  await sleep(500);
  await press("Enter", "Enter", 13);
  await sleep(1500);
  await b.shot("docs/screenshots/phase6-ls-filled.png", { fullPage: true });

  const payBtn = await b.evaluate(`(() => { const btn = [...document.querySelectorAll('button')].find(x => /^Pay \\$/.test(x.innerText.trim())); btn.scrollIntoView({ block: 'center' }); const r = btn.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, disabled: btn.disabled, text: btn.innerText.trim() }; })()`);
  check("pay button enabled after filling the test card", !payBtn.disabled, payBtn);
  await click(payBtn.x, payBtn.y);

  // ---------------------------------------------------------------- back on our site, webhook-confirmed
  let here = "";
  for (let i = 0; i < 90 && !here.startsWith(BASE); i++) {
    await sleep(1000);
    here = await b.evaluate("location.href").catch(() => "");
  }
  check("Lemon Squeezy redirects back to our confirmation page", here.startsWith(`${BASE}/checkout/success`), here);
  await b.shot("docs/screenshots/phase6-after-payment.png");
  let status = "";
  for (let i = 0; i < 60 && status !== "paid"; i++) {
    status = (await db.query("select status from orders where id = $1", [orderId])).rows[0]?.status;
    if (status !== "paid") await sleep(2000);
  }
  check("REAL webhook received → order paid", status === "paid", status);
  const { rows: paid } = await db.query("select subtotal_cents, tax_cents, total_cents, provider_order_id, receipt_url from orders where id = $1", [orderId]);
  check("provider order id, tax/total and receipt recorded", Boolean(paid[0].provider_order_id && paid[0].receipt_url) && paid[0].total_cents === paid[0].subtotal_cents + (paid[0].tax_cents ?? 0), paid[0]);
  const { rows: ev } = await db.query("select event_name, outcome from payment_events where order_id = $1 order by received_at", [orderId]);
  check("payment event logged as 'paid'", ev.some((e) => e.event_name === "order_created" && e.outcome === "paid"), ev);
  check("confirmation page shows success", await wait(`document.body.innerText.includes('Thank you!')`, 60000));
  check("bag cleared after confirmed payment", (await b.evaluate(`localStorage.getItem('bag:v1')`)) === "[]");
  await b.shot("docs/screenshots/phase6-confirmed.png");

  await b.go("/dashboard", DEVICES.desktop, { settle: 1500 });
  check("library shows the purchased book", await wait(`document.querySelector('a[aria-label="Download QA Book Alpha"]')`, 60000));
  const cookies = (await b.send("Network.getCookies", { urls: [BASE] })).cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const dl = await fetch(`${BASE}/api/download/${rows[0].id}`, { headers: { cookie: cookies }, redirect: "manual" });
  const loc = dl.headers.get("location") ?? "";
  const file = loc.startsWith("http") ? await fetch(loc) : null;
  check("download delivers the file", file?.ok && (await file.text()).startsWith("%PDF"), [dl.status, loc.slice(0, 60)]);

  // ---------------------------------------------------------------- real refund through the admin panel
  const admin = { email: qaEmail("live-admin"), password: qaPassword() };
  await createUser(admin.email, admin.password, { role: "admin" });
  check("admin signs in", await signIn(admin.email, admin.password, `/admin/orders/${orderId}`));
  await wait(`[...document.querySelectorAll('button')].some(x => /^Refund /.test(x.textContent.trim()))`, 60000);
  await b.evaluate(`[...document.querySelectorAll('button')].find(x => /^Refund /.test(x.textContent.trim())).click(); true`);
  await sleep(300);
  await clickText("Confirm refund");
  check("refund accepted by Lemon Squeezy", await wait(`document.body.innerText.includes('Refund requested')`, 60000), await b.evaluate(`[...document.querySelectorAll('[role=alert]')].map(a => a.textContent)`));
  for (let i = 0; i < 60 && status !== "refunded"; i++) {
    status = (await db.query("select status from orders where id = $1", [orderId])).rows[0]?.status;
    if (status !== "refunded") await sleep(2000);
  }
  check("REAL refund webhook → order refunded", status === "refunded", status);
  const { rows: grants } = await db.query("select count(*)::int n from downloads where order_id = $1 and revoked_at is null", [orderId]);
  check("refund revoked download access", grants[0].n === 0);
  await b.go(`/admin/orders/${orderId}`, DEVICES.desktop, { settle: 1500 });
  await b.shot("docs/screenshots/phase6-refunded-order.png", { fullPage: true });
} catch (e) {
  check("script error", false, String(e));
} finally {
  if (!KEEP_OPEN) {
    await db.query("delete from orders where email like 'qa-%@example.test'").catch(() => {});
    await cleanupQa().catch(() => {});
    await deleteQaUsers().catch(() => {});
  }
  await db.end();
  b.close();
}
process.exit(finish(b.consoleErrors.filter((e) => !/lemonsqueezy|stripe|paypal|hcaptcha|sentry/i.test(e))));
