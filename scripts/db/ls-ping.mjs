/** Checks the Lemon Squeezy API key + store ID (prints no secrets). */
import { loadEnv } from "./env.mjs";

const env = loadEnv();
const headers = { Accept: "application/vnd.api+json", Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}` };
const get = async (path) => {
  const r = await fetch(`https://api.lemonsqueezy.com/v1/${path}`, { headers });
  return { status: r.status, body: r.ok ? await r.json() : await r.text() };
};

const me = await get("users/me");
console.log(`API key: ${me.status === 200 ? "OK" : `FAILED (${me.status})`}`);
if (me.status !== 200) process.exit(1);

const store = await get(`stores/${env.LEMONSQUEEZY_STORE_ID}`);
if (store.status !== 200) {
  console.log(`Store ${env.LEMONSQUEEZY_STORE_ID}: FAILED (${store.status}) — check the store ID`);
  const all = await get("stores");
  if (all.status === 200) console.log("Stores this key can see:", all.body.data.map((s) => `${s.id} (${s.attributes.name})`).join(", "));
  process.exit(1);
}
const a = store.body.data.attributes;
console.log(`Store ${store.body.data.id}: OK — "${a.name}", currency ${a.currency}, country ${a.country ?? "?"}`);
const products = await get(`products?filter[store_id]=${env.LEMONSQUEEZY_STORE_ID}`);
if (products.status === 200) {
  const list = products.body.data;
  console.log(`Products: ${list.length}${list.length ? " — " + list.map((p) => `${p.attributes.name} [${p.attributes.status}${p.attributes.test_mode ? ", test" : ""}]`).join("; ") : ""}`);
  console.log(`Mode: ${list.length ? (list.every((p) => p.attributes.test_mode) ? "TEST" : "LIVE (or mixed)") : "unknown until a product exists"}`);
}
