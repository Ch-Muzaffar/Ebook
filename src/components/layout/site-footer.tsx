import Link from "next/link";
import { cacheLife } from "next/cache";
import { footerNav } from "@/config/site";
import { getSiteSettings, type SocialLinks } from "@/lib/settings/queries";
import { CookieSettingsButton } from "@/components/consent/consent";
import { Logo } from "./logo";

/** Cache Components forbids a bare `new Date()` in prerendered output; cache it and refresh daily. */
async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

const SOCIAL_LABELS: Record<keyof SocialLinks, string> = {
  x: "X",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

export async function SiteFooter() {
  const settings = await getSiteSettings();
  const social = (Object.keys(SOCIAL_LABELS) as (keyof SocialLinks)[]).filter((k) => settings.social[k]);

  return (
    <footer className="glass rounded-none border-x-0 border-b-0">
      <div className="mx-auto grid w-full max-w-wide gap-12 px-gutter py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="flex max-w-xs flex-col gap-4">
          <Logo />
          <p className="text-small text-muted">{settings.description}</p>
          {social.length > 0 && (
            <ul aria-label="Social media" className="flex flex-wrap gap-x-4 gap-y-1">
              {social.map((k) => (
                <li key={k}>
                  <a href={settings.social[k]} target="_blank" rel="noopener noreferrer me" className="text-small text-muted underline-offset-4 hover:text-charcoal hover:underline">
                    {SOCIAL_LABELS[k]}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        {footerNav.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <p className="mb-4 text-eyebrow font-medium uppercase text-gold-deep">{group.title}</p>
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="inline-flex min-h-9 items-center text-small text-muted hover:text-charcoal">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line/80">
        <div className="mx-auto flex w-full max-w-wide flex-wrap items-center justify-between gap-x-6 gap-y-2 px-gutter py-6 text-caption text-muted">
          <p>
            © <CopyrightYear /> {settings.brandName}
            {settings.publisherName && <> · Published by {settings.publisherName}</>}. All rights reserved.
          </p>
          <CookieSettingsButton className="min-h-9 underline-offset-4 hover:text-charcoal hover:underline" />
        </div>
      </div>
    </footer>
  );
}
