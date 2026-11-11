/** Delete one Lemon Squeezy webhook by id:  node scripts/payments/delete-webhook.mjs 150437 */
import { loadEnv } from "../db/env.mjs";

const id = process.argv[2];
if (!/^\d+$/.test(id ?? "")) throw new Error("Usage: node scripts/payments/delete-webhook.mjs <webhook id>");
const env = loadEnv();
const r = await fetch(`https://api.lemonsqueezy.com/v1/webhooks/${id}`, {
  method: "DELETE",
  headers: { Accept: "application/vnd.api+json", Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}` },
});
console.log(r.status === 204 ? `webhook #${id} deleted` : `FAILED (${r.status}) ${await r.text()}`);
