import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";
import { refundPolicy } from "@/lib/legal/content";
import { getSiteSettings } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "All sales of digital books are final, except for duplicate charges, faulty files and refunds required by law.",
  alternates: { canonical: "/refund-policy" },
};

export default async function RefundPolicyPage() {
  const settings = await getSiteSettings();
  return <LegalPage title="Refund Policy" markdown={refundPolicy(settings)} />;
}
