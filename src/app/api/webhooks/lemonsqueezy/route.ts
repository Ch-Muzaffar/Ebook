import { createHash } from "node:crypto";
import { applyRefund, fulfilOrder, getOrder } from "@/lib/orders/service";
import { paymentConfig, verifySignature } from "@/lib/payments/lemonsqueezy";
import { serviceDb } from "@/lib/supabase/service";

/**
 * Lemon Squeezy webhook — the ONLY thing that marks an order paid (PRD §8.6).
 *
 * 1. Verify the X-Signature HMAC over the raw body (reject otherwise, 401).
 * 2. Record the event (idempotency: the same body is processed once).
 * 3. order_created: check it matches OUR order — store, variant, currency, subtotal (our price),
 *    status "paid", test/live mode — then mark paid, grant downloads, email the receipt.
 * 4. order_refunded: full refund → revoke access; partial → record only.
 * Mismatches are recorded as "rejected" and acknowledged (200) so the provider doesn't retry
 * forever; they are visible to the admin on the order page.
 */
type LsOrderEvent = {
  meta?: { event_name?: string; custom_data?: { order_id?: string } };
  data?: {
    id?: string;
    attributes?: {
      store_id?: number;
      identifier?: string;
      order_number?: number;
      currency?: string;
      subtotal?: number;
      tax?: number;
      total?: number;
      status?: string;
      refunded?: boolean;
      test_mode?: boolean;
      first_order_item?: { variant_id?: number };
      urls?: { receipt?: string };
    };
  };
};

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 512 * 1024) return new Response("Payload too large", { status: 413 });
  if (!verifySignature(raw, request.headers.get("x-signature"))) return new Response("Invalid signature", { status: 401 });

  let event: LsOrderEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Malformed JSON", { status: 400 });
  }
  const name = event.meta?.event_name ?? request.headers.get("x-event-name") ?? "unknown";
  const orderId = event.meta?.custom_data?.order_id;
  const db = serviceDb();
  const eventId = createHash("sha256").update(raw).digest("hex");

  // Idempotency: if we've already processed this exact delivery, acknowledge and stop.
  const { data: seen } = await db.from("payment_events").select("processed_at").eq("id", eventId).maybeSingle();
  if (seen?.processed_at) return Response.json({ ok: true, duplicate: true });
  const validOrderId = orderId && /^[0-9a-f-]{36}$/i.test(orderId) ? orderId : null;
  await db.from("payment_events").upsert({ id: eventId, event_name: name, order_id: validOrderId, payload: event as object }, { onConflict: "id" });

  let outcome: string;
  try {
    outcome = await handle(name, event, validOrderId);
  } catch (e) {
    console.error("webhook:", e);
    // Not marked processed → Lemon Squeezy retries later.
    await db.from("payment_events").update({ outcome: `error: ${e instanceof Error ? e.message : "unknown"}`.slice(0, 500) }).eq("id", eventId);
    return new Response("Processing error", { status: 500 });
  }
  await db.from("payment_events").update({ processed_at: new Date().toISOString(), outcome }).eq("id", eventId);
  return Response.json({ ok: true, outcome });
}

async function handle(name: string, event: LsOrderEvent, orderId: string | null): Promise<string> {
  const a = event.data?.attributes;
  if (name !== "order_created" && name !== "order_refunded") return `ignored: ${name}`;
  if (!a || !orderId) return "rejected: no order reference";
  const order = await getOrder(orderId);
  if (!order) return "rejected: unknown order";

  const cfg = paymentConfig();
  if (String(a.store_id) !== cfg.storeId) return "rejected: different store";
  if (a.test_mode && !cfg.testMode) return "rejected: test-mode payment while live";
  if (Boolean(a.test_mode) !== order.test_mode) return "rejected: test/live mode mismatch";

  if (name === "order_created") {
    if (order.status === "paid") return "ignored: already paid";
    if (order.status !== "pending") return `rejected: order is ${order.status}`;
    if (String(a.first_order_item?.variant_id) !== cfg.variantId) return "rejected: different product variant";
    if ((a.currency ?? "").toUpperCase() !== order.currency) return `rejected: currency ${a.currency} ≠ ${order.currency}`;
    if (a.subtotal !== order.subtotal_cents) return `rejected: amount ${a.subtotal} ≠ expected ${order.subtotal_cents}`;
    if (a.status !== "paid") return `ignored: payment status ${a.status}`;
    const r = await fulfilOrder(order.id, {
      providerOrderId: String(event.data?.id),
      orderNumber: a.order_number ?? null,
      totalCents: a.total ?? a.subtotal,
      taxCents: a.tax ?? 0,
      receiptUrl: a.urls?.receipt ?? null,
    });
    return r.changed ? "paid" : "ignored: already paid";
  }

  // order_refunded
  if (order.provider_order_id && order.provider_order_id !== String(event.data?.id)) return "rejected: different provider order";
  if (order.status !== "paid" && order.status !== "partially_refunded") return `ignored: order is ${order.status}`;
  const full = Boolean(a.refunded) || a.status === "refunded";
  await applyRefund(order.id, full);
  return full ? "refunded" : "partially refunded";
}
