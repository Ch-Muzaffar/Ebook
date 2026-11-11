import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingIndicator } from "@/components/ui/states";
import { getCurrentUser } from "@/lib/auth/session";
import { getPublishedProducts } from "@/lib/catalog/queries";
import { ownedProductIds } from "@/lib/orders/service";
import { paymentsReady } from "@/lib/payments/lemonsqueezy";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <>
      <PageHeader title="Checkout" />
      <Container className="py-section">
        <Suspense fallback={<LoadingIndicator label="Loading checkout" />}>
          <Checkout />
        </Suspense>
      </Container>
    </>
  );
}

async function Checkout() {
  const [user, catalog] = await Promise.all([getCurrentUser(), getPublishedProducts()]);
  const owned = user ? await ownedProductIds(user.id) : new Set<string>();
  const ownedSlugs = catalog.filter((p) => owned.has(p.id)).map((p) => p.slug);
  return <CheckoutView catalog={catalog} ownedSlugs={ownedSlugs} signedIn={Boolean(user)} paymentsReady={paymentsReady()} />;
}
