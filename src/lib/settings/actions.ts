"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { sessionDb } from "@/lib/supabase/server";
import { SETTINGS_TAG } from "./queries";

export type SettingsState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;

const SOCIAL = ["x", "facebook", "instagram", "linkedin", "youtube"] as const;
const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string).trim() : "");

export async function saveSettingsAction(_prev: SettingsState, fd: FormData): Promise<SettingsState> {
  await requireAdmin();
  const result = await save(fd);
  // On any error, send back what was typed so the form doesn't lose the admin's other edits.
  return result.error ? { ...result, values: Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string> } : result;
}

/** Admin → Advertising. Ads can only be switched on once a publisher id and at least one ad unit exist. */
export async function saveAdsAction(_prev: SettingsState, fd: FormData): Promise<SettingsState> {
  await requireAdmin();
  const result = await saveAds(fd);
  return result.error ? { ...result, values: Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string> } : result;
}

async function saveAds(fd: FormData): Promise<{ error?: string; ok?: string }> {
  const enabled = fd.get("adsEnabled") === "on";
  // Accept "pub-123…" or "ca-pub-123…" as copied from AdSense; store the ca-pub form.
  let client = str(fd, "adsenseClientId").replace(/\s+/g, "");
  if (/^pub-\d+$/.test(client)) client = `ca-${client}`;
  const slots = { ad_slot_home: str(fd, "slotHome"), ad_slot_article: str(fd, "slotArticle"), ad_slot_sidebar: str(fd, "slotSidebar") };

  if (client && !/^ca-pub-\d{10,20}$/.test(client)) return { error: "Publisher ID should look like ca-pub-1234567890123456." };
  for (const v of Object.values(slots)) if (v && !/^\d{6,20}$/.test(v)) return { error: "Ad unit IDs are numbers only (the data-ad-slot value)." };
  if (enabled && !client) return { error: "Add your AdSense publisher ID before turning ads on." };
  if (enabled && !Object.values(slots).some(Boolean)) return { error: "Add at least one ad unit ID before turning ads on." };

  const db = await sessionDb();
  const { error } = await db
    .from("site_settings")
    .update({ ads_enabled: enabled, adsense_client_id: client, ...slots })
    .eq("id", 1)
    .select("id")
    .single();
  if (error) {
    console.error("ads settings:", error.message);
    return { error: "Could not save advertising settings. Please try again." };
  }
  updateTag(SETTINGS_TAG);
  return { ok: enabled ? "Saved — ads are live on the selected placements." : "Saved — ads are switched off." };
}

async function save(fd: FormData): Promise<{ error?: string; ok?: string }> {
  const brand = str(fd, "brandName");
  const tagline = str(fd, "tagline");
  const description = str(fd, "description");
  const email = str(fd, "contactEmail");
  const publisher = str(fd, "publisherName");
  const country = str(fd, "businessCountry");
  if (publisher.length > 120) return { error: "Publisher name must be 120 characters or fewer." };
  if (country.length > 60) return { error: "Country must be 60 characters or fewer." };
  if (!brand || brand.length > 60) return { error: "Brand name is required (60 characters max)." };
  if (!tagline || tagline.length > 120) return { error: "Tagline is required (120 characters max)." };
  if (!description || description.length > 200) return { error: "Description is required (200 characters max)." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Contact email doesn't look valid." };

  const social: Record<string, string> = {};
  for (const k of SOCIAL) {
    const v = str(fd, `social_${k}`);
    if (!v) continue;
    if (!/^https:\/\/[^\s]+$/.test(v) || v.length > 300) return { error: `The ${k} link must start with https://` };
    social[k] = v;
  }

  const db = await sessionDb();
  const { error } = await db
    .from("site_settings")
    .update({ brand_name: brand, tagline, description, contact_email: email, social_links: social, publisher_name: publisher, business_country: country })
    .eq("id", 1)
    .select("id")
    .single();
  if (error) {
    console.error("settings:", error.message);
    return { error: "Could not save settings. Please try again." };
  }
  updateTag(SETTINGS_TAG);
  return { ok: "Settings saved — the site is updated." };
}
