import { connection } from "next/server";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { LoadingIndicator } from "@/components/ui/states";
import { getSiteSettings } from "@/lib/settings/queries";

export const metadata = { title: "Settings" };

export default function AdminSettingsPage() {
  return (
    <>
      <AdminPageHeader title="Settings" description="Brand, contact details and social links used across the site." />
      <Suspense fallback={<LoadingIndicator label="Loading settings" />}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  await connection();
  return <SettingsForm settings={await getSiteSettings()} />;
}
