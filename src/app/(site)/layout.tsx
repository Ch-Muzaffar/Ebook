import { CookieBanner } from "@/components/consent/consent";
import { TagManager } from "@/components/consent/tag-manager";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CursorFollower } from "@/components/motion/cursor";
import { ViewTransitionGuard } from "@/components/motion/view-transition-guard";

const GTM_ID = /^GTM-[A-Z0-9]{4,12}$/.test(process.env.NEXT_PUBLIC_GTM_ID ?? "") ? process.env.NEXT_PUBLIC_GTM_ID : undefined;

/**
 * Public website shell: header, main landmark, footer, cookie consent + consent-gated analytics,
 * and the premium layer (page transitions, paper grain, cursor ring).
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter />
      <CookieBanner />
      <TagManager id={GTM_ID} />
      <ViewTransitionGuard />
      <CursorFollower />
      <div aria-hidden className="paper-grain" />
    </>
  );
}
