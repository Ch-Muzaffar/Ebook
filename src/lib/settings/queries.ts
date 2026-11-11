import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { siteConfig } from "@/config/site";
import { publicDb } from "@/lib/supabase/public";

export const SETTINGS_TAG = "settings";

export type SocialLinks = Partial<Record<"x" | "facebook" | "instagram" | "linkedin" | "youtube", string>>;
export type AdsSettings = {
  enabled: boolean;
  clientId: string; // ca-pub-…
  slotHome: string;
  slotArticle: string;
  slotSidebar: string;
};
export type SiteSettings = {
  brandName: string;
  tagline: string;
  description: string;
  contactEmail: string;
  publisherName: string;
  businessCountry: string;
  social: SocialLinks;
  ads: AdsSettings;
};

const FALLBACK: SiteSettings = {
  brandName: siteConfig.name,
  tagline: siteConfig.tagline,
  description: siteConfig.description,
  contactEmail: "",
  publisherName: "",
  businessCountry: "",
  social: {},
  ads: { enabled: false, clientId: "", slotHome: "", slotArticle: "", slotSidebar: "" },
};

/** Brand, publisher, contact and advertising settings (Admin → Settings / Advertising). Cached until saved. */
export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("max");
  const { data, error } = await publicDb()
    .from("site_settings")
    .select("brand_name, tagline, description, contact_email, social_links, publisher_name, business_country, ads_enabled, adsense_client_id, ad_slot_home, ad_slot_article, ad_slot_sidebar")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("site settings:", error.message);
    return FALLBACK;
  }
  return {
    brandName: data.brand_name,
    tagline: data.tagline,
    description: data.description,
    contactEmail: data.contact_email,
    publisherName: data.publisher_name,
    businessCountry: data.business_country,
    social: (data.social_links as SocialLinks) ?? {},
    ads: {
      enabled: data.ads_enabled,
      clientId: data.adsense_client_id,
      slotHome: data.ad_slot_home,
      slotArticle: data.ad_slot_article,
      slotSidebar: data.ad_slot_sidebar,
    },
  };
}
