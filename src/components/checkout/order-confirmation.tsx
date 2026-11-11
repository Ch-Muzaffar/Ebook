"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LinkButton } from "@/components/ui/button";
import { LoadingIndicator } from "@/components/ui/states";
import { bag } from "@/lib/cart/cart-store";
import { orderStatusAction } from "@/lib/orders/actions";

/**
 * Shown after returning from Lemon Squeezy. Returning here proves nothing — we wait for OUR server
 * to receive and verify the payment webhook, polling the order status for up to ~2 minutes.
 */
export function OrderConfirmation() {
  const orderId = useSearchParams().get("order") ?? "";
  const [state, setState] = useState<"checking" | "paid" | "waiting" | "problem" | "missing">(orderId ? "checking" : "missing");

  useEffect(() => {
    if (!orderId) return;
    let stop = false;
    let tries = 0;
    const tick = async () => {
      const r = await orderStatusAction(orderId).catch(() => ({ status: undefined, error: "network" }));
      if (stop) return;
      if (r.status === "paid") {
        bag.clear();
        return setState("paid");
      }
      if (r.error === "not-found" || r.error === "invalid") return setState("missing");
      if (r.status === "failed" || r.status === "cancelled") return setState("problem");
      tries++;
      if (tries >= 60) return setState("waiting");
      setTimeout(tick, 2000);
    };
    tick();
    return () => {
      stop = true;
    };
  }, [orderId]);

  if (state === "checking")
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <LoadingIndicator label="Confirming your payment" />
        <p className="text-small text-muted">This usually takes a few seconds. Please keep this page open.</p>
      </div>
    );
  if (state === "paid")
    return (
      <div role="status" className="mx-auto flex max-w-lg flex-col items-center gap-5 text-center">
        <p className="font-serif text-h2">Thank you!</p>
        <p className="text-muted">Your payment is confirmed and your books are ready. We&apos;ve also emailed you a receipt.</p>
        <LinkButton href="/dashboard" size="lg">Go to my library</LinkButton>
      </div>
    );
  if (state === "waiting")
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 text-center">
        <p className="font-serif text-h3">Still confirming your payment</p>
        <p className="text-muted">This can occasionally take a few minutes. We&apos;ll email you as soon as your books are ready, and they&apos;ll appear in your library automatically.</p>
        <LinkButton href="/dashboard" variant="secondary">Go to my library</LinkButton>
      </div>
    );
  if (state === "problem")
    return (
      <div role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-4 text-center">
        <p className="font-serif text-h3">The payment didn&apos;t go through</p>
        <p className="text-muted">You haven&apos;t been charged. Please try again.</p>
        <LinkButton href="/checkout">Back to checkout</LinkButton>
      </div>
    );
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 text-center">
      <p className="font-serif text-h3">We couldn&apos;t find that order</p>
      <LinkButton href="/dashboard" variant="secondary">Go to my library</LinkButton>
    </div>
  );
}
