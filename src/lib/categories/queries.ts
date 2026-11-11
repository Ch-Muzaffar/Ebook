import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { CATEGORY_COLUMNS, must, toCategory } from "@/lib/supabase/mappers";
import { publicDb } from "@/lib/supabase/public";
import type { Category } from "./types";

export const CATEGORIES_TAG = "categories";

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheTag(CATEGORIES_TAG);
  cacheLife("max");
  const rows = must(await publicDb().from("categories").select(CATEGORY_COLUMNS).order("sort_order").order("name"), "categories");
  return rows.map(toCategory);
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  return (await getCategories()).find((c) => c.slug === slug);
}

export async function categoryNameOf(slug: string): Promise<string> {
  return (await getCategory(slug))?.name ?? slug;
}
