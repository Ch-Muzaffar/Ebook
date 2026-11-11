"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { SiteSettings } from "@/lib/settings/queries";
import { saveSettingsAction } from "@/lib/settings/actions";

const SOCIAL = [
  ["x", "X (Twitter)"],
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["linkedin", "LinkedIn"],
  ["youtube", "YouTube"],
] as const;

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, action, pending] = useActionState(saveSettingsAction, undefined);
  // After an error, refill with what was submitted (React resets forms to their defaults).
  const v = state?.values;
  const val = (key: string, fallback: string) => v?.[key] ?? fallback;
  return (
    <form action={action} className="flex max-w-3xl flex-col gap-10">
      {state?.error && <p role="alert" className="rounded-md bg-danger/10 px-4 py-3 text-small text-danger">{state.error}</p>}
      {state?.ok && <p role="status" className="rounded-md bg-success/10 px-4 py-3 text-small text-success">{state.ok}</p>}

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-4 font-serif text-h4">Brand</legend>
        <Input label="Brand name" name="brandName" defaultValue={val("brandName", settings.brandName)} maxLength={60} hint="Shown in the header, footer, page titles and admin." />
        <Input label="Homepage headline (tagline)" name="tagline" defaultValue={val("tagline", settings.tagline)} maxLength={120} />
        <Textarea label="Short description" name="description" defaultValue={val("description", settings.description)} maxLength={200} rows={3} hint="Homepage intro, footer and default search description." />
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-4 font-serif text-h4">Contact</legend>
        <Input label="Contact email" name="contactEmail" type="email" defaultValue={val("contactEmail", settings.contactEmail)} hint="Shown on the Contact page and in the legal pages." />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Publisher (person or business)" name="publisherName" defaultValue={val("publisherName", settings.publisherName)} maxLength={120} hint="Named on the About page and as the operator in the legal pages." />
          <Input label="Country of operation" name="businessCountry" defaultValue={val("businessCountry", settings.businessCountry)} maxLength={60} />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-4 font-serif text-h4">Social links</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          {SOCIAL.map(([key, label]) => (
            <Input key={key} label={label} name={`social_${key}`} type="url" placeholder="https://…" defaultValue={val(`social_${key}`, settings.social[key] ?? "")} />
          ))}
        </div>
        <p className="text-caption text-muted">Links appear in the footer. Leave a field empty to hide it.</p>
      </fieldset>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
