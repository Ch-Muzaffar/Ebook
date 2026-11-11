import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { resilientFetch } from "@/lib/supabase/fetch";

/**
 * Lemon Squeezy (Merchant of Record) integration.
 *
 * Model: ONE generic product/variant in Lemon Squeezy ("eBook order"). Each checkout is created
 * server-side with a custom price equal to the books in the customer's bag (priced from OUR
 * database), and carries our order id in custom data. Lemon Squeezy collects payment, adds any
 * sales tax/VAT, and notifies us via a signed webhook — the only thing that marks an order paid.
 */
const API = "https://api.lemonsqueezy.com/v1";

export function paymentConfig() {
  return {
    apiKey: process.env.LEMONSQUEEZY_API_KEY ?? "",
    storeId: process.env.LEMONSQUEEZY_STORE_ID ?? "",
    variantId: process.env.LEMONSQUEEZY_VARIANT_ID ?? "",
    webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "",
    /** true until the owner switches to live payments (then set LEMONSQUEEZY_TEST_MODE=false). */
    testMode: (process.env.LEMONSQUEEZY_TEST_MODE ?? "true") !== "false",
  };
}

export function paymentsReady() {
  const c = paymentConfig();
  return Boolean(c.apiKey && c.storeId && c.variantId && c.webhookSecret);
}

async function ls<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiKey } = paymentConfig();
  const res = await resilientFetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = (body as { errors?: { detail?: string }[] }).errors?.[0]?.detail ?? res.statusText;
    throw new Error(`Lemon Squeezy ${init.method ?? "GET"} ${path} failed (${res.status}): ${detail}`);
  }
  return body as T;
}

export async function createCheckout(input: {
  orderId: string;
  email: string;
  name: string;
  priceCents: number;
  title: string;
  description: string;
  redirectUrl: string;
}): Promise<{ id: string; url: string }> {
  const c = paymentConfig();
  const body = {
    data: {
      type: "checkouts",
      attributes: {
        custom_price: input.priceCents,
        product_options: {
          name: input.title.slice(0, 250),
          description: input.description.slice(0, 1000),
          redirect_url: input.redirectUrl,
          receipt_button_text: "Go to my library",
          receipt_link_url: input.redirectUrl,
          enabled_variants: [Number(c.variantId)],
        },
        checkout_options: { embed: false, media: false, logo: true, desc: true, discount: false, button_color: "#252522" },
        checkout_data: { email: input.email, name: input.name || undefined, custom: { order_id: input.orderId } },
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // link valid for 2 hours
        test_mode: c.testMode,
      },
      relationships: {
        store: { data: { type: "stores", id: c.storeId } },
        variant: { data: { type: "variants", id: c.variantId } },
      },
    },
  };
  const res = await ls<{ data: { id: string; attributes: { url: string } } }>("/checkouts", { method: "POST", body: JSON.stringify(body) });
  return { id: res.data.id, url: res.data.attributes.url };
}

/** Full refund. The resulting order_refunded webhook updates our records (single source of truth). */
export async function refundOrder(providerOrderId: string) {
  await ls(`/orders/${encodeURIComponent(providerOrderId)}/refund`, {
    method: "POST",
    body: JSON.stringify({ data: { type: "orders", id: String(providerOrderId), attributes: {} } }),
  });
}

/** Constant-time check of the X-Signature header: hex HMAC-SHA256 of the RAW body with our secret. */
export function verifySignature(rawBody: string, signature: string | null) {
  const { webhookSecret } = paymentConfig();
  if (!webhookSecret || !signature || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(createHmac("sha256", webhookSecret).update(rawBody, "utf8").digest("hex"), "hex");
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
