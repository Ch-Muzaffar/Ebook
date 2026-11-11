import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderConfirmation } from "@/components/checkout/order-confirmation";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingIndicator } from "@/components/ui/states";

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false } };

export default function CheckoutSuccessPage() {
  return (
    <>
      <PageHeader title="Your order" />
      <Container className="py-section">
        <Suspense fallback={<LoadingIndicator />}>
          <OrderConfirmation />
        </Suspense>
      </Container>
    </>
  );
}
