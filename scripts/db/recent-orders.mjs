/** Read-only: the most recent orders with their webhook events and download access (no secrets printed). */
import { connect } from "./env.mjs";

const db = await connect();
const { rows: orders } = await db.query(`
  select o.id, o.status, o.test_mode, o.subtotal_cents, o.tax_cents, o.total_cents, o.provider_order_id, o.receipt_url is not null as has_receipt,
         o.created_at, o.paid_at, o.refunded_at, regexp_replace(o.email, '(.{2}).*(@.*)', '\\1…\\2') as email,
         (select string_agg(title, ', ') from order_items i where i.order_id = o.id) as books,
         (select count(*)::int from downloads d where d.order_id = o.id and d.revoked_at is null) as active_downloads,
         (select coalesce(sum(download_count),0)::int from downloads d where d.order_id = o.id) as times_downloaded
  from orders o order by o.created_at desc limit 5`);
for (const o of orders) {
  console.log(`\n${o.created_at.toISOString()}  ${o.email}  [${o.status}${o.test_mode ? ", test" : ", LIVE"}]  ${o.books}`);
  console.log(`  subtotal ${o.subtotal_cents} · tax ${o.tax_cents} · total ${o.total_cents} · LS order ${o.provider_order_id ?? "—"} · receipt ${o.has_receipt}`);
  console.log(`  paid ${o.paid_at?.toISOString() ?? "—"} · refunded ${o.refunded_at?.toISOString() ?? "—"} · active downloads ${o.active_downloads} · downloaded ${o.times_downloaded}×`);
  const { rows: ev } = await db.query("select event_name, outcome, received_at from payment_events where order_id = $1 order by received_at", [o.id]);
  for (const e of ev) console.log(`  event ${e.event_name} → ${e.outcome}  (${e.received_at.toISOString()})`);
}
if (!orders.length) console.log("No orders yet.");
const { rows: unlinked } = await db.query("select event_name, outcome, received_at from payment_events where order_id is null order by received_at desc limit 5");
if (unlinked.length) console.log("\nEvents not linked to an order:", unlinked.map((e) => `${e.event_name}→${e.outcome}`).join("; "));
await db.end();
