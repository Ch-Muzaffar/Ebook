import "server-only";

import { getSiteSettings } from "@/lib/settings/queries";
import { button, esc, layout, sendEmail } from "@/lib/email/send";
import { formatPrice } from "@/lib/format";
import { siteUrl } from "@/lib/site-url";
import { serviceDb } from "@/lib/supabase/service";

/**
 * Order + entitlement writes. Server-only, service role: customers can never write these tables
 * (RLS + revoked privileges). Called only from the checkout action and verified webhooks.
 */
export type OrderRow = {
  id: string;
  user_id: string;
  email: string;
  status: "pending" | "paid" | "refunded" | "partially_refunded" | "failed" | "cancelled";
  currency: string;
  subtotal_cents: number;
  tax_cents: number | null;
  total_cents: number | null;
  provider_order_id: string | null;
  test_mode: boolean;
};

export async function ownedProductIds(userId: string): Promise<Set<string>> {
  const { data, error } = await serviceDb().from("downloads").select("product_id").eq("user_id", userId).is("revoked_at", null);
  if (error) throw new Error(`owned: ${error.message}`);
  return new Set(data.map((d) => d.product_id as string));
}

export async function createPendingOrder(input: {
  userId: string;
  email: string;
  items: { productId: string; title: string; priceCents: number }[];
  testMode: boolean;
}) {
  const db = serviceDb();
  const subtotal = input.items.reduce((s, i) => s + i.priceCents, 0);
  const { data: order, error } = await db
    .from("orders")
    .insert({ user_id: input.userId, email: input.email, subtotal_cents: subtotal, currency: "USD", test_mode: input.testMode })
    .select("id")
    .single();
  if (error) throw new Error(`create order: ${error.message}`);
  const { error: itemsError } = await db
    .from("order_items")
    .insert(input.items.map((i) => ({ order_id: order.id, product_id: i.productId, title: i.title, price_cents: i.priceCents })));
  if (itemsError) {
    await db.from("orders").delete().eq("id", order.id);
    throw new Error(`create order items: ${itemsError.message}`);
  }
  return { id: order.id as string, subtotal };
}

export async function getOrder(id: string): Promise<OrderRow | null> {
  const { data } = await serviceDb()
    .from("orders")
    .select("id, user_id, email, status, currency, subtotal_cents, tax_cents, total_cents, provider_order_id, test_mode")
    .eq("id", id)
    .maybeSingle();
  return (data as OrderRow) ?? null;
}

/** Mark paid + grant downloads + email receipt. Idempotent: a second call for a paid order does nothing. */
export async function fulfilOrder(
  orderId: string,
  payment: { providerOrderId: string; orderNumber: number | null; totalCents: number; taxCents: number; receiptUrl: string | null },
) {
  const db = serviceDb();
  const { data: updated, error } = await db
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      provider_order_id: payment.providerOrderId,
      provider_order_number: payment.orderNumber,
      total_cents: payment.totalCents,
      tax_cents: payment.taxCents,
      receipt_url: payment.receiptUrl,
    })
    .eq("id", orderId)
    .eq("status", "pending") // only the first successful event transitions the order
    .select("id, user_id, email")
    .maybeSingle();
  if (error) throw new Error(`mark paid: ${error.message}`);
  if (!updated) return { changed: false };

  const { data: items, error: itemsError } = await db.from("order_items").select("product_id, title, price_cents").eq("order_id", orderId);
  if (itemsError) throw new Error(`order items: ${itemsError.message}`);
  const grants = items
    .filter((i) => i.product_id)
    .map((i) => ({ user_id: updated.user_id, product_id: i.product_id, order_id: orderId, granted_at: new Date().toISOString(), revoked_at: null }));
  if (grants.length) {
    const { error: grantError } = await db.from("downloads").upsert(grants, { onConflict: "user_id,product_id" });
    if (grantError) throw new Error(`grant downloads: ${grantError.message}`);
  }

  await sendReceipt(updated.email, orderId, items, payment.totalCents);
  return { changed: true };
}

async function sendReceipt(to: string, orderId: string, items: { title: string; price_cents: number }[], totalCents: number) {
  const { brandName } = await getSiteSettings();
  const library = `${siteUrl()}/dashboard`;
  const rows = items
    .map((i) => `<tr><td style="padding:6px 0">${esc(i.title)}</td><td style="padding:6px 0;text-align:right">${formatPrice(i.price_cents)}</td></tr>`)
    .join("");
  const html = layout(
    brandName,
    `<p style="margin-top:0">Thank you for your purchase! Your ${items.length === 1 ? "book is" : "books are"} ready to download.</p>
     <table role="presentation" width="100%" style="border-top:1px solid #eae3d8;border-bottom:1px solid #eae3d8;margin:16px 0">${rows}
     <tr><td style="padding:8px 0;font-weight:600">Total paid</td><td style="padding:8px 0;text-align:right;font-weight:600">${formatPrice(totalCents)}</td></tr></table>
     <p>${button(library, "Download from my library")}</p>
     <p style="font-size:13px;color:#5e5a52">Order reference: ${esc(orderId)}<br>A payment receipt from Lemon Squeezy, our payment provider, is sent separately.</p>`,
  );
  const text = `Thank you for your purchase!\n\n${items.map((i) => `- ${i.title}: ${formatPrice(i.price_cents)}`).join("\n")}\nTotal paid: ${formatPrice(totalCents)}\n\nDownload from your library: ${library}\n\nOrder reference: ${orderId}`;
  await sendEmail({ to, subject: `Your books from ${brandName} are ready to download`, html, text, idempotencyKey: `receipt-${orderId}` });
}

/** Full refund → status refunded + access revoked. Partial refund → recorded, access kept. */
export async function applyRefund(orderId: string, full: boolean) {
  const db = serviceDb();
  const now = new Date().toISOString();
  const { error } = await db
    .from("orders")
    .update({ status: full ? "refunded" : "partially_refunded", refunded_at: now })
    .eq("id", orderId)
    .in("status", ["paid", "partially_refunded"]);
  if (error) throw new Error(`refund: ${error.message}`);
  if (full) {
    const { error: revokeError } = await db.from("downloads").update({ revoked_at: now }).eq("order_id", orderId).is("revoked_at", null);
    if (revokeError) throw new Error(`revoke: ${revokeError.message}`);
  }
}

/** Free orders (total $0) need no payment provider. */
export async function fulfilFreeOrder(orderId: string) {
  return fulfilOrder(orderId, { providerOrderId: `free-${orderId}`, orderNumber: null, totalCents: 0, taxCents: 0, receiptUrl: null });
}
