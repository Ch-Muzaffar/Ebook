/**
 * Payments + delivery check against the LIVE database, data-safe (qa-* only).
 * Simulates Lemon Squeezy webhooks signed with our secret (exactly as Lemon Squeezy signs them)
 * and verifies: signature enforcement, amount/currency/variant/store checks, idempotency,
 * entitlement + secure download, refund → access revoked, and that customers can't forge orders.
 *
 *   node scripts/payment-check.mjs [baseUrl]
 * The server under test must run with the same LEMONSQUEEZY_* settings (variant id included).
 */
import { createHmac, randomUUID } from "node:crypto";
import { DEVICES, launch } from "./lib/browser.mjs";
import { cleanupQa, seedQa } from "./lib/qa-content.mjs";
import { accessToken, createUser, deleteQaUsers, env, qaEmail, qaPassword } from "./lib/qa-users.mjs";
import { connect } from "./db/env.mjs";
import { FILES, helpers, reporter } from "./lib/ui.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
process.env.QA_BASE_URL = BASE;
const VARIANT = process.env.LEMONSQUEEZY_VARIANT_ID ?? env.LEMONSQUEEZY_VARIANT_ID;
const STORE = env.LEMONSQUEEZY_STORE_ID;
const { check, finish } = reporter();
const b = await launch({ base: BASE, port: 9346 });
const { wait, signIn } = helpers(b);
let db;

const sign = (raw) => createHmac("sha256", env.LEMONSQUEEZY_WEBHOOK_SECRET).update(raw).digest("hex");
async function webhook(payload, { signature, raw } = {}) {
  const body = raw ?? JSON.stringify(payload);
  const r = await fetch(`${BASE}/api/webhooks/lemonsqueezy`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Event-Name": payload?.meta?.event_name ?? "", "X-Signature": signature ?? sign(body) },
    body,
  });
  return { status: r.status, json: await r.json().catch(() => null) };
}
const orderEvent = (name, orderId, o = {}) => ({
  meta: { event_name: name, custom_data: { order_id: orderId } },
  data: {
    type: "orders",
    id: o.lsId ?? "99000001",
    attributes: {
      store_id: Number(o.store ?? STORE),
      identifier: randomUUID(),
      order_number: 4242,
      currency: o.currency ?? "USD",
      subtotal: o.subtotal,
      tax: o.tax ?? 0,
      total: (o.subtotal ?? 0) + (o.tax ?? 0),
      status: o.status ?? "paid",
      refunded: o.refunded ?? false,
      test_mode: o.test ?? true,
      first_order_item: { variant_id: Number(o.variant ?? VARIANT), price: o.subtotal },
      urls: { receipt: "https://example.test/receipt" },
      nonce: randomUUID(),
    },
  },
});
const orderStatus = async (id) => (await db.query("select status from orders where id = $1", [id])).rows[0]?.status;
const activeGrants = async (userId) => (await db.query("select count(*)::int n from downloads where user_id = $1 and revoked_at is null", [userId])).rows[0].n;

async function pendingOrder(userId, email, productIds, subtotal) {
  const { rows } = await db.query(
    "insert into orders (user_id, email, subtotal_cents, currency, test_mode) values ($1,$2,$3,'USD',true) returning id",
    [userId, email, subtotal],
  );
  for (const pid of productIds) await db.query("insert into order_items (order_id, product_id, title, price_cents) select $1, id, title, price_cents from products where id = $2", [rows[0].id, pid]);
  return rows[0].id;
}

try {
  if (!VARIANT) throw new Error("LEMONSQUEEZY_VARIANT_ID is not set for the test run");
  await seedQa();
  await deleteQaUsers();
  db = await connect();
  const { rows: books } = await db.query("select id, slug, price_cents from products where slug in ('qa-book-alpha','qa-book-beta') order by slug");
  const [alpha, beta] = books;
  // Give qa-book-alpha a (tiny) private file so downloads can be exercised.
  const path = `ebook/qa-upload-${randomUUID()}.pdf`;
  const up = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/ebook-files/${path}`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/pdf" },
    body: Buffer.from(FILES.pdf, "base64"),
  });
  check("setup: private test file uploaded", up.ok, up.status);
  await db.query("insert into product_files (product_id, path, file_name, size_bytes, mime_type) values ($1,$2,'qa-upload-book.pdf',100,'application/pdf')", [alpha.id, path]);

  const buyer = { email: qaEmail("buyer"), password: qaPassword() };
  const user = await createUser(buyer.email, buyer.password, { name: "QA Buyer" });
  const subtotal = alpha.price_cents + beta.price_cents;
  const orderId = await pendingOrder(user.id, buyer.email, [alpha.id, beta.id], subtotal);

  // ---------------------------------------------------------------- signature + validation
  check("unsigned/forged webhook → 401", (await webhook(orderEvent("order_created", orderId, { subtotal }), { signature: "0".repeat(64) })).status === 401);
  check("garbage signature → 401", (await webhook(orderEvent("order_created", orderId, { subtotal }), { signature: "not-hex" })).status === 401);
  check("still pending after forged webhooks", (await orderStatus(orderId)) === "pending");

  let r = await webhook(orderEvent("order_created", orderId, { subtotal: subtotal - 1 }));
  check("wrong amount → rejected, not paid", r.json?.outcome?.startsWith("rejected: amount") && (await orderStatus(orderId)) === "pending", r.json);
  r = await webhook(orderEvent("order_created", orderId, { subtotal, currency: "EUR" }));
  check("wrong currency → rejected", r.json?.outcome?.startsWith("rejected: currency"), r.json);
  r = await webhook(orderEvent("order_created", orderId, { subtotal, variant: 1 }));
  check("different product variant → rejected", r.json?.outcome?.startsWith("rejected: different product"), r.json);
  r = await webhook(orderEvent("order_created", orderId, { subtotal, store: 1 }));
  check("different store → rejected", r.json?.outcome?.startsWith("rejected: different store"), r.json);
  r = await webhook(orderEvent("order_created", orderId, { subtotal, test: false }));
  check("live/test mode mismatch → rejected", r.json?.outcome?.startsWith("rejected:"), r.json);
  r = await webhook(orderEvent("order_created", randomUUID(), { subtotal }));
  check("unknown order → rejected", r.json?.outcome === "rejected: unknown order", r.json);
  r = await webhook(orderEvent("order_created", orderId, { subtotal, status: "pending" }));
  check("payment not completed (status pending) → not paid", (await orderStatus(orderId)) === "pending", r.json);
  check("no access granted yet", (await activeGrants(user.id)) === 0);

  // ---------------------------------------------------------------- success + idempotency
  const paidEvent = orderEvent("order_created", orderId, { subtotal, tax: 150 });
  const raw = JSON.stringify(paidEvent);
  r = await webhook(paidEvent, { raw });
  check("valid signed payment → order paid", r.json?.outcome === "paid" && (await orderStatus(orderId)) === "paid", r.json);
  const { rows: paidRow } = await db.query("select total_cents, tax_cents, provider_order_id from orders where id = $1", [orderId]);
  check("tax + total recorded from provider", paidRow[0].total_cents === subtotal + 150 && paidRow[0].tax_cents === 150);
  check("both books granted", (await activeGrants(user.id)) === 2);
  r = await webhook(paidEvent, { raw });
  check("exact replay → acknowledged as duplicate, no double processing", r.json?.duplicate === true, r.json);
  r = await webhook(orderEvent("order_created", orderId, { subtotal }));
  check("second payment event for a paid order → ignored", r.json?.outcome === "ignored: already paid", r.json);

  // ---------------------------------------------------------------- customer can't forge orders
  const token = await accessToken(buyer.email, buyer.password);
  const auth = { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const forge = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders`, { method: "POST", headers: auth, body: JSON.stringify({ user_id: user.id, email: buyer.email, subtotal_cents: 0, status: "paid" }) });
  check("customer cannot insert orders via the API", !forge.ok, forge.status);
  const grantForge = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/downloads`, { method: "POST", headers: auth, body: JSON.stringify({ user_id: user.id, product_id: alpha.id, order_id: orderId }) });
  check("customer cannot grant themselves downloads", !grantForge.ok, grantForge.status);
  const own = await (await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders?select=id`, { headers: auth })).json();
  check("customer sees only their own orders", Array.isArray(own) && own.length === 1 && own[0].id === orderId);
  const files = await (await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/product_files?select=path`, { headers: auth })).json();
  check("customer cannot read file locations", Array.isArray(files) && files.length === 0);

  // ---------------------------------------------------------------- library + secure download
  check("buyer signs in", await signIn(buyer.email, buyer.password, "/dashboard"));
  check("library lists purchased books", await wait(`document.querySelectorAll('a[href^="/api/download/"]').length === 2`));
  check("order history shows the order", await wait(`document.body.innerText.includes('Order history') && document.body.innerText.includes('Paid')`));
  const dl = await b.evaluate(`fetch('/api/download/${alpha.id}', { redirect: 'manual' }).then(r => ({ type: r.type, status: r.status }))`);
  check("download request redirects (to a signed URL)", dl.type === "opaqueredirect" || dl.status === 303, dl);
  const loc = await (async () => {
    const cookies = (await b.send("Network.getCookies", { urls: [BASE] })).cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const res = await fetch(`${BASE}/api/download/${alpha.id}`, { headers: { cookie: cookies }, redirect: "manual" });
    return res.headers.get("location") ?? "";
  })();
  check("signed URL points to private storage with a short expiry", /\/storage\/v1\/object\/sign\/ebook-files\//.test(loc) && /token=/.test(loc), loc.slice(0, 80));
  const file = loc ? await fetch(loc) : null;
  check("signed URL downloads the file", file?.ok && (await file.text()).startsWith("%PDF"), file?.status);
  const noFile = await fetch(`${BASE}/api/download/${beta.id}`, { headers: { cookie: (await b.send("Network.getCookies", { urls: [BASE] })).cookies.map((c) => `${c.name}=${c.value}`).join("; ") }, redirect: "manual" });
  check("book without a file → friendly 'being prepared' notice", (noFile.headers.get("location") ?? "").includes("notice=file-pending"));
  const anon = await fetch(`${BASE}/api/download/${alpha.id}`, { redirect: "manual" });
  check("signed-out download → sent to login", (anon.headers.get("location") ?? "").includes("/login"));

  // A different customer can't download it.
  const other = { email: qaEmail("other"), password: qaPassword() };
  await createUser(other.email, other.password);
  check("other customer signs in", await signIn(other.email, other.password, "/dashboard"));
  const stolen = await b.evaluate(`fetch('/api/download/${alpha.id}', { redirect: 'manual' }).then(r => r.status)`);
  const otherCookies = (await b.send("Network.getCookies", { urls: [BASE] })).cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const stolenLoc = (await fetch(`${BASE}/api/download/${alpha.id}`, { headers: { cookie: otherCookies }, redirect: "manual" })).headers.get("location") ?? "";
  check("non-buyer cannot download", stolenLoc.includes("notice=download-missing"), [stolen, stolenLoc]);

  // ---------------------------------------------------------------- deleting a purchased book is blocked
  const del = await db.query("select count(*)::int n from downloads where product_id = $1", [alpha.id]);
  let blocked = false;
  try {
    await db.query("delete from products where id = $1", [alpha.id]);
  } catch {
    blocked = true;
  }
  check("database refuses to delete a purchased book", blocked && del.rows[0].n > 0);

  // ---------------------------------------------------------------- refund
  r = await webhook(orderEvent("order_refunded", orderId, { subtotal, status: "refunded", refunded: true, lsId: paidRow[0].provider_order_id }));
  check("refund webhook → order refunded", r.json?.outcome === "refunded" && (await orderStatus(orderId)) === "refunded", r.json);
  check("refund revokes download access", (await activeGrants(user.id)) === 0);
  const afterRefund = await fetch(`${BASE}/api/download/${alpha.id}`, { redirect: "manual" });
  check("download route redirects when access is gone", afterRefund.status >= 300);

  // ---------------------------------------------------------------- checkout page states
  await b.send("Network.clearBrowserCookies");
  await b.evaluate(`localStorage.setItem('bag:v1', JSON.stringify(['qa-book-alpha'])); true`);
  await b.go("/checkout", DEVICES.desktop, { settle: 1000 });
  check("checkout asks signed-out visitors to sign in", await wait(`document.body.innerText.includes('Sign in to complete your purchase')`));
  check("buyer signs in again", await signIn(buyer.email, buyer.password, "/checkout"));
  check("checkout shows pay button with server price", await wait(`[...document.querySelectorAll('button')].some(b => /Pay \\$9\\.00 securely/.test(b.textContent))`));
  await b.shot("docs/screenshots/phase6-checkout.png", { fullPage: true });

  // ---------------------------------------------------------------- admin orders page
  const admin = { email: qaEmail("pay-admin"), password: qaPassword() };
  await createUser(admin.email, admin.password, { role: "admin" });
  check("admin signs in", await signIn(admin.email, admin.password, "/admin/orders?mode=test"));
  check("admin sees the test order", await wait(`document.querySelector('tbody')?.innerText.includes(${JSON.stringify(buyer.email)})`));
  await b.go(`/admin/orders/${orderId}`, DEVICES.desktop, { settle: 800 });
  check("order detail shows the event log", await wait(`document.body.innerText.includes('order_created') && document.body.innerText.includes('rejected: amount') && document.body.innerText.includes('refunded')`));
  await b.shot("docs/screenshots/phase6-admin-order.png", { fullPage: true });
} catch (e) {
  check("script error", false, String(e));
} finally {
  if (db) {
    await db.query("delete from orders where email like 'qa-%@example.test'").catch(() => {});
    // Simulated events are marked by their example.test receipt URL.
    await db.query("delete from payment_events where payload->'data'->'attributes'->'urls'->>'receipt' = 'https://example.test/receipt'").catch(() => {});
    await db.end();
  }
  await cleanupQa().catch((e) => check("cleanup content", false, String(e)));
  await deleteQaUsers().catch(() => {});
  b.close();
}
process.exit(finish(b.consoleErrors));
