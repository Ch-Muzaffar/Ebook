import { getSiteSettings } from "@/lib/settings/queries";
import { AdUnit } from "./ad-unit";

export type AdPlacement = "home" | "article" | "sidebar";

/**
 * Advertising placement (PRD §11). Renders NOTHING unless an admin has switched ads on AND
 * configured the AdSense publisher id and this placement's ad unit — so no ads can appear before
 * AdSense approval. Only placed on the homepage and article pages: never in checkout, payment,
 * download, account or admin pages.
 */
export async function AdSlot({ placement }: { placement: AdPlacement }) {
  const { ads } = await getSiteSettings();
  const slot = placement === "home" ? ads.slotHome : placement === "article" ? ads.slotArticle : ads.slotSidebar;
  if (!ads.enabled || !ads.clientId || !slot) return null;

  const unit = <AdUnit clientId={ads.clientId} slot={slot} format={placement === "sidebar" ? "vertical" : "auto"} />;

  if (placement === "sidebar")
    return (
      <aside aria-label="Advertisement" className="absolute top-10 left-[calc(100%+3rem)] hidden w-[300px] 2xl:block">
        <div className="sticky top-[calc(var(--spacing-header)+2rem)]">
          <p className="mb-2 text-caption uppercase tracking-wide text-muted">Advertisement</p>
          {unit}
        </div>
      </aside>
    );

  return (
    <aside aria-label="Advertisement" className="my-12 border-y border-line py-6">
      <p className="mb-3 text-center text-caption uppercase tracking-wide text-muted">Advertisement</p>
      {unit}
    </aside>
  );
}
