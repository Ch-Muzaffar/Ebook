"use server";

import { requireAdmin } from "@/lib/auth/session";
import { refundOrder } from "@/lib/payments/lemonsqueezy";
import { getOrder } from "./service";

/**
 * Ask Lemon Squeezy to refund an order in full. Our records change only when the verified
 * order_refunded webhook arrives (single source of truth), which also revokes download access.
 */
export async function refundOrderAction(orderId: string): Promise<{ ok?: string; error?: string }> {
  await requireAdmin();
  const order = await getOrder(orderId);
  if (!order) return { error: "Order not found." };
  if (order.status !== "paid" && order.status !== "partially_refunded") return { error: `This order is ${order.status} and can't be refunded.` };
  if (!order.provider_order_id || order.provider_order_id.startsWith("free-")) return { error: "This order wasn't paid through Lemon Squeezy." };
  try {
    await refundOrder(order.provider_order_id);
  } catch (e) {
    console.error("refund:", e);
    return { error: "Lemon Squeezy refused the refund. You can also refund from the Lemon Squeezy dashboard." };
  }
  return { ok: "Refund requested. The order updates (and access is removed) as soon as Lemon Squeezy confirms it — usually within a minute." };
}
