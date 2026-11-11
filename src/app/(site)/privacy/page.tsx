import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";
import { privacyPolicy } from "@/lib/legal/content";
import { getSiteSettings } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What personal information we collect, how we use it, cookies, and your privacy rights.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const settings = await getSiteSettings();
  return <LegalPage title="Privacy Policy" markdown={privacyPolicy(settings)} />;
}
