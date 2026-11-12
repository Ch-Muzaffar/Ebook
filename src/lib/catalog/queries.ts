import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import type { Product } from "@/lib/content/types";
import { must, PRODUCT_COLUMNS, toProduct } from "@/lib/supabase/mappers";
import { publicDb } from "@/lib/supabase/public";
import { getCategories } from "@/lib/categories/queries";
import { findProduct, listAllProducts } from "./product-store";

/** Cache tag for every public catalog read; admin mutations call updateTag(PRODUCTS_TAG). */
export const PRODUCTS_TAG = "products";

/** Published products only (enforced by RLS too). Cached until an admin edit. */
export async function getPublishedProducts(): Promise<Product[]> {
  "use cache";
  cacheTag(PRODUCTS_TAG);
  cacheLife("max");
  const rows = must(
    await publicDb().from("products").select(PRODUCT_COLUMNS).eq("status", "published").order("published_at", { ascending: false, nullsFirst: false }),
    "published products",
  );
  return rows.map(toProduct);
}

export async function getPublishedProduct(slug: string): Promise<Product | undefined> {
  return (await getPublishedProducts()).find((p) => p.slug === slug);
}

export async function getFeaturedProducts(limit = 3): Promise<Product[]> {
  return (await getPublishedProducts()).filter((p) => p.featured).slice(0, limit);
}

/**
 * Homepage 3D spotlight: the newest featured book from each category (in category order),
 * topped up with other featured books if there are fewer categories than slots.
 */
export async function getSpotlightProducts(limit = 3): Promise<Product[]> {
  const [featured, categories] = await Promise.all([getFeaturedProducts(Infinity), getCategories()]);
  const picks: Product[] = [];
  for (const c of categories) {
    const p = featured.find((f) => f.category === c.slug);
    if (p && picks.length < limit) picks.push(p);
  }
  for (const f of featured) if (picks.length < limit && !picks.includes(f)) picks.push(f);
  return picks;
}

/** Same category first, then the newest others. */
export async function getRelatedProducts(product: Product, limit = 3): Promise<Product[]> {
  const others = (await getPublishedProducts()).filter((p) => p.id !== product.id);
  const same = others.filter((p) => p.category === product.category);
  const rest = others.filter((p) => p.category !== product.category);
  return [...same, ...rest].slice(0, limit);
}

/** Admin: every product including drafts, always fresh (never cached). */
export async function getAllProductsForAdmin(): Promise<Product[]> {
  await connection();
  return listAllProducts();
}

export async function getProductForAdmin(id: string): Promise<Product | undefined> {
  await connection();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  return findProduct(id);
}
