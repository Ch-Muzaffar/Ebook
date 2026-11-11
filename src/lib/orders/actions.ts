"use server";

import { rateLimit } from "@/lib/auth/rate-limit";
import { getCurrentUser } from "@/lib/auth/session";
import { getPublishedProducts } from "@/lib/catalog/queries";
import { createCheckout, paymentConfig, paymentsReady } from "@/lib/payments/lemonsqueezy";
import { getSiteSettings } from "@/lib/settings/queries";
import { siteUrl } from "@/lib/site-url";
import { serviceDb } from "@/lib/supabase/service";
import { createPendingOrder, fulfilFreeOrder, getOrder, ownedProductIds } from "./service";

export type CheckoutResult = { url?: string; error?: string; signIn?: boolean };

/**
 * Start a checkout for the books in the bag. The browser sends only SLUGS; every price is read
 * from our database here. Books the customer already owns are skipped. Payment is NOT trusted
 * from the redirect: the order is marked paid only by the verified webhook.
 */
export async function startCheckoutAction(slugs: string[]): Promise<CheckoutResult> {
  const user = await getCurrentUser();
  if (!user) return { signIn: true, error: "Please sign in to complete your purchase." };
  if (!paymentsReady()) return { error: "Payments aren't available yet. Please try again soon." };
  if (!Array.isArray(slugs) || slugs.length === 0 || slugs.length > 50 || !slugs.every((s) => typeof s === "string" && /^[a-z0-9-]{1,80}$/.test(s)))
    return { error: "Your bag is empty or invalid." };
  if (!(await rateLimit("checkout", 10, 10 * 60 * 1000, user.id))) return { error: "Too many attempts. Please wait a few minutes and try again." };

  const catalog = await getPublishedProducts();
  const owned = await ownedProductIds(user.id);
  const wanted = [...new Set(slugs)].map((s) => catalog.find((p) => p.slug === s)).filter((p) => p !== undefined);
  const toBuy = wanted.filter((p) => !owned.has(p.id));
  if (!wanted.length) return { error: "These books are no longer available." };
  if (!toBuy.length) return { error: "You already own every book in your bag — find them in My library." };

  const { testMode } = paymentConfig();
  const order = await createPendingOrder({
    userId: user.id,
    email: user.email,
    items: toBuy.map((p) => ({ productId: p.id, title: p.title, priceCents: p.priceCents })),
    testMode,
  });

  if (order.subtotal === 0) {
    await fulfilFreeOrder(order.id);
    return { url: `/checkout/success?order=${order.id}` };
  }

  const { brandName } = await getSiteSettings();
  try {
    const checkout = await createCheckout({
      orderId: order.id,
      email: user.email,
      name: user.fullName,
      priceCents: order.subtotal,
      title: toBuy.length === 1 ? toBuy[0].title : `${toBuy.length} eBooks from ${brandName}`,
      description: toBuy.map((p) => `• ${p.title} — ${p.author}`).join("\n"),
      redirectUrl: `${siteUrl()}/checkout/success?order=${order.id}`,
    });
    await serviceDb().from("orders").update({ provider_checkout_id: checkout.id }).eq("id", order.id);
    return { url: checkout.url };
  } catch (e) {
    console.error("checkout:", e);
    await serviceDb().from("orders").update({ status: "failed" }).eq("id", order.id);
    return { error: "We couldn't start the payment. Please try again in a moment." };
  }
}

/** Status for the success page (own orders only). */
export async function orderStatusAction(orderId: string): Promise<{ status?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "signed-out" };
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return { error: "invalid" };
  const order = await getOrder(orderId);
  if (!order || order.user_id !== user.id) return { error: "not-found" };
  return { status: order.status };
}
