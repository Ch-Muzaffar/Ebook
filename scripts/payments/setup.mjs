/**
 * Lemon Squeezy setup helper (prints no secrets).
 *
 *   node scripts/payments/setup.mjs                      → find the generic product, save LEMONSQUEEZY_VARIANT_ID
 *   node scripts/payments/setup.mjs --webhook https://x  → (re)register the webhook for that public site address
 *   node scripts/payments/setup.mjs --list-webhooks
 */
import { readFileSync, writeFileSync } from "node:fs";
import { loadEnv } from "../db/env.mjs";

const env = loadEnv();
const testMode = (env.LEMONSQUEEZY_TEST_MODE ?? "true") !== "false";
const headers = { Accept: "application/vnd.api+json", "Content-Type": "application/vnd.api+json", Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}` };
const api = async (path, init = {}) => {
  const r = await fetch(`https://api.lemonsqueezy.com/v1${path}`, { ...init, headers });
  const body = r.status === 204 ? {} : await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${r.status} ${JSON.stringify(body.errors ?? body).slice(0, 200)}`);
  return body;
};
function saveEnv(values) {
  const text = readFileSync(".env.local", "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  let lines = text.split(/\r?\n/);
  for (const [k, v] of Object.entries(values)) lines = lines.filter((l) => !new RegExp(`^\\s*${k}\\s*=`).test(l)).concat(`${k}=${v}`);
  while (lines.length && lines.at(-1) === "") lines.pop();
  writeFileSync(".env.local", lines.join(eol) + eol);
}

const args = process.argv.slice(2);
const hookIdx = args.indexOf("--webhook");

if (args.includes("--list-webhooks")) {
  const { data } = await api(`/webhooks?filter[store_id]=${env.LEMONSQUEEZY_STORE_ID}`);
  for (const w of data) console.log(`#${w.id}  ${w.attributes.url}  events=${(w.attributes.events ?? []).join(",") || "(none)"}  test=${w.attributes.test_mode}`);
  if (!data.length) console.log("No webhooks registered.");
} else if (hookIdx !== -1) {
  const base = (args[hookIdx + 1] ?? "").replace(/\/+$/, "");
  if (!/^https:\/\//.test(base)) throw new Error("Give the public HTTPS address of the site, e.g. --webhook https://digitaltraffic.blog");
  const url = `${base}/api/webhooks/lemonsqueezy`;
  // Remove older registrations for this endpoint path (e.g. expired temporary tunnels) in the same mode.
  const { data } = await api(`/webhooks?filter[store_id]=${env.LEMONSQUEEZY_STORE_ID}`);
  for (const w of data)
    if (w.attributes.url.endsWith("/api/webhooks/lemonsqueezy") && w.attributes.test_mode === testMode) {
      await api(`/webhooks/${w.id}`, { method: "DELETE" });
      console.log(`removed old webhook #${w.id} (${w.attributes.url})`);
    }
  const created = await api("/webhooks", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "webhooks",
        attributes: { url, events: ["order_created", "order_refunded"], secret: env.LEMONSQUEEZY_WEBHOOK_SECRET, test_mode: testMode },
        relationships: { store: { data: { type: "stores", id: env.LEMONSQUEEZY_STORE_ID } } },
      },
    }),
  });
  console.log(`webhook #${created.data.id} registered → ${url} (${testMode ? "test" : "LIVE"} mode, events: order_created, order_refunded)`);
} else {
  await saveVariant();
}

async function saveVariant() {
  const { data: products } = await api(`/products?filter[store_id]=${env.LEMONSQUEEZY_STORE_ID}`);
  if (!products.length) {
    console.log("No products in the store yet — create the generic 'eBook order' product first (see instructions).");
    process.exitCode = 1;
    return;
  }
  const product = products.find((p) => /ebook\s*order/i.test(p.attributes.name)) ?? (products.length === 1 ? products[0] : null);
  if (!product) {
    console.log(`Several products found (${products.map((p) => p.attributes.name).join(", ")}). Name the generic one "eBook order".`);
    process.exitCode = 1;
    return;
  }
  const { data: variants } = await api(`/variants?filter[product_id]=${product.id}`);
  const variant = variants.find((v) => v.attributes.status !== "pending") ?? variants[0];
  if (!variant) throw new Error("The product has no variant.");
  console.log(`product "${product.attributes.name}" (#${product.id}, ${product.attributes.status}${product.attributes.test_mode ? ", test mode" : ""}) → variant #${variant.id}`);
  if (product.attributes.status !== "published") console.log("⚠ The product isn't published yet — publish it in Lemon Squeezy, or checkouts will fail.");
  saveEnv({ LEMONSQUEEZY_VARIANT_ID: variant.id, ...(env.LEMONSQUEEZY_TEST_MODE ? {} : { LEMONSQUEEZY_TEST_MODE: "true" }) });
  console.log("saved LEMONSQUEEZY_VARIANT_ID" + (env.LEMONSQUEEZY_TEST_MODE ? "" : " and LEMONSQUEEZY_TEST_MODE=true"));
}
