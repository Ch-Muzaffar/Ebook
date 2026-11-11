import "server-only";

import { CATEGORY_COLUMNS, must, toCategory } from "@/lib/supabase/mappers";
import { sessionDb } from "@/lib/supabase/server";
import type { Category } from "./types";

/** Admin category storage (Supabase, session client → RLS requires admin for writes). */
export async function listAllCategories(): Promise<Category[]> {
  const db = await sessionDb();
  const rows = must(await db.from("categories").select(CATEGORY_COLUMNS).order("sort_order").order("name"), "list categories");
  return rows.map(toCategory);
}

export async function insertCategory(c: { slug: string; name: string; description?: string; order: number }) {
  const db = await sessionDb();
  must(await db.from("categories").insert({ slug: c.slug, name: c.name, description: c.description ?? null, sort_order: c.order }).select("id").single(), "create category");
}

export async function updateCategory(id: string, patch: { name: string; description?: string; order?: number }) {
  const db = await sessionDb();
  must(
    await db
      .from("categories")
      .update({ name: patch.name, description: patch.description ?? null, ...(patch.order !== undefined ? { sort_order: patch.order } : {}) })
      .eq("id", id)
      .select("id")
      .single(),
    "update category",
  );
}

export async function deleteCategory(id: string) {
  const db = await sessionDb();
  must(await db.from("categories").delete().eq("id", id).select("id").single(), "delete category");
}

/** How many books / articles use each category slug (admin view). */
export async function categoryUsage(): Promise<Record<string, { books: number; articles: number }>> {
  const db = await sessionDb();
  const [products, links] = await Promise.all([
    db.from("products").select("category_slug"),
    db.from("article_categories").select("category_slug"),
  ]);
  const usage: Record<string, { books: number; articles: number }> = {};
  for (const r of must(products, "usage products")) (usage[r.category_slug] ??= { books: 0, articles: 0 }).books++;
  for (const r of must(links, "usage articles")) (usage[r.category_slug] ??= { books: 0, articles: 0 }).articles++;
  return usage;
}
