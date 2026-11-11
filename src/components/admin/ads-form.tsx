"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SiteSettings } from "@/lib/settings/queries";
import { saveAdsAction } from "@/lib/settings/actions";

export function AdsForm({ ads }: { ads: SiteSettings["ads"] }) {
  const [state, action, pending] = useActionState(saveAdsAction, undefined);
  const v = state?.values;
  const val = (key: string, fallback: string) => v?.[key] ?? fallback;
  const enabled = v ? v.adsEnabled === "on" : ads.enabled;
  return (
    <form action={action} className="flex max-w-3xl flex-col gap-10">
      {state?.error && <p role="alert" className="rounded-md bg-danger/10 px-4 py-3 text-small text-danger">{state.error}</p>}
      {state?.ok && <p role="status" className="rounded-md bg-success/10 px-4 py-3 text-small text-success">{state.ok}</p>}

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-4 font-serif text-h4">Google AdSense</legend>
        <Input
          label="Publisher ID"
          name="adsenseClientId"
          placeholder="ca-pub-1234567890123456"
          defaultValue={val("adsenseClientId", ads.clientId)}
          hint="AdSense → Account → Account information. Also publishes /ads.txt automatically."
        />
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-4 font-serif text-h4">Ad units</legend>
        <p className="-mt-2 text-small text-muted">
          Create a <strong>Display ad</strong> unit in AdSense → Ads → By ad unit, and paste its <code>data-ad-slot</code> number. Leave a
          placement empty to keep it ad-free. Ads never appear on checkout, bag, account, download or admin pages.
        </p>
        <div className="grid gap-5 sm:grid-cols-3">
          <Input label="Homepage" name="slotHome" inputMode="numeric" defaultValue={val("slotHome", ads.slotHome)} hint="Between articles and newsletter." />
          <Input label="Article (in content)" name="slotArticle" inputMode="numeric" defaultValue={val("slotArticle", ads.slotArticle)} hint="After the article text." />
          <Input label="Article sidebar" name="slotSidebar" inputMode="numeric" defaultValue={val("slotSidebar", ads.slotSidebar)} hint="Very wide screens only." />
        </div>
      </fieldset>

      <label className="glass flex cursor-pointer items-start gap-3 rounded-md p-4 hover:ring-muted">
        <input type="checkbox" name="adsEnabled" defaultChecked={enabled} className="mt-1 accent-charcoal" />
        <span className="flex flex-col">
          <span className="text-small font-medium">Show ads on the website</span>
          <span className="text-caption text-muted">
            Turn on only after AdSense has approved the site. Ads load only for visitors who accept cookies.
          </span>
        </span>
      </label>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save advertising"}
      </Button>
    </form>
  );
}
