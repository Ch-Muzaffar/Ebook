import type { Metadata } from "next";
import { Suspense } from "react";
import { UnsubscribeForm } from "@/components/newsletter/unsubscribe-form";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingIndicator } from "@/components/ui/states";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

/** Confirmation button rather than unsubscribing on page load, so email link scanners can't unsubscribe people. */
export default function UnsubscribePage() {
  return (
    <>
      <PageHeader title="Unsubscribe" description="Stop receiving our newsletter." />
      <Container width="narrow" className="py-section">
        <Suspense fallback={<LoadingIndicator />}>
          <UnsubscribeForm />
        </Suspense>
      </Container>
    </>
  );
}
