import { connection } from "next/server";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdsForm } from "@/components/admin/ads-form";
import { LoadingIndicator } from "@/components/ui/states";
import { getSiteSettings } from "@/lib/settings/queries";

export const metadata = { title: "Advertising" };

export default function AdminAdvertisingPage() {
  return (
    <>
      <AdminPageHeader title="Advertising" description="Google AdSense placements. Everything stays off until you switch it on." />
      <Suspense fallback={<LoadingIndicator label="Loading advertising settings" />}>
        <Advertising />
      </Suspense>
    </>
  );
}

async function Advertising() {
  await connection();
  const { ads } = await getSiteSettings();
  const live = ads.enabled && ads.clientId;
  return (
    <div className="flex flex-col gap-8">
      <p className={`self-start rounded-pill px-3 py-1 text-caption font-medium ${live ? "bg-success/10 text-success" : "bg-beige text-muted"}`}>
        {live ? "Ads are ON" : "Ads are OFF"}
      </p>
      <AdsForm ads={ads} />
      <section className="max-w-3xl rounded-lg bg-beige p-6 text-small text-muted">
        <h2 className="mb-2 font-serif text-h4 text-charcoal">Applying for AdSense</h2>
        <ol className="flex list-decimal flex-col gap-1 pl-5">
          <li>Launch the site on its own domain with several original, useful articles published.</li>
          <li>Sign up at adsense.google.com, add the site, and paste your publisher ID above (this publishes /ads.txt).</li>
          <li>Wait for approval — About, Contact, Privacy and Terms pages are already in place.</li>
          <li>Create display ad units, paste their IDs above, then tick “Show ads” and save.</li>
        </ol>
      </section>
    </div>
  );
}
