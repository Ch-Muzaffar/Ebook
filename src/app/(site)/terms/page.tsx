import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";
import { termsOfService } from "@/lib/legal/content";
import { getSiteSettings } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using the website and buying digital books.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const settings = await getSiteSettings();
  return <LegalPage title="Terms of Service" markdown={termsOfService(settings)} />;
}
