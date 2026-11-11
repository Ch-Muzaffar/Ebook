"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/require-admin";
import { slugify } from "@/lib/catalog/validation";
import { CATEGORIES_TAG } from "./queries";
import * as store from "./store";

export type CategoryFormState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;

/** On error, echo the submitted values so React's post-submit form reset doesn't erase them. */
const withValues = (fd: FormData, r: { error: string }): CategoryFormState => ({
  ...r,
  values: Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>,
});

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string).trim() : "");

function validate(name: string, description: string, order: string) {
  if (!name) return "Name is required.";
  if (name.length > 60) return "Name must be 60 characters or fewer.";
  if (description.length > 200) return "Description must be 200 characters or fewer.";
  if (order && !/^\d{1,4}$/.test(order)) return "Order must be a whole number.";
  return null;
}

export async function createCategoryAction(_prev: CategoryFormState, fd: FormData): Promise<CategoryFormState> {
  await requireAdmin();
  const name = str(fd, "name");
  const description = str(fd, "description");
  const slug = str(fd, "slug") || slugify(name);
  const invalid = validate(name, description, "");
  if (invalid) return withValues(fd, { error: invalid });
  if (!SLUG.test(slug)) return withValues(fd, { error: "Slug: use lowercase letters, numbers and single hyphens." });
  const all = await store.listAllCategories();
  if (all.some((c) => c.slug === slug)) return withValues(fd, { error: "A category with this slug already exists." });
  if (all.some((c) => c.name.toLowerCase() === name.toLowerCase())) return withValues(fd, { error: "A category with this name already exists." });
  await store.insertCategory({ slug, name, description: description || undefined, order: Math.max(0, ...all.map((c) => c.order)) + 1 });
  updateTag(CATEGORIES_TAG);
  return { ok: `Category “${name}” created.` };
}

/** Name, description and order are editable. The slug is fixed: books and articles reference it. */
export async function updateCategoryAction(id: string, _prev: CategoryFormState, fd: FormData): Promise<CategoryFormState> {
  await requireAdmin();
  const name = str(fd, "name");
  const description = str(fd, "description");
  const order = str(fd, "order");
  const invalid = validate(name, description, order);
  if (invalid) return withValues(fd, { error: invalid });
  const all = await store.listAllCategories();
  if (all.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) return withValues(fd, { error: "Another category has this name." });
  await store.updateCategory(id, { name, description: description || undefined, order: order ? Number(order) : undefined });
  updateTag(CATEGORIES_TAG);
  return { ok: "Saved." };
}

export async function deleteCategoryAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  const category = (await store.listAllCategories()).find((c) => c.id === id);
  if (!category) return { error: "Category not found." };
  const usage = (await store.categoryUsage())[category.slug] ?? { books: 0, articles: 0 };
  if (usage.books || usage.articles)
    return { error: `In use by ${usage.books} book(s) and ${usage.articles} article(s). Move them to another category first.` };
  await store.deleteCategory(id); // the database also refuses (foreign keys) if something still uses it
  updateTag(CATEGORIES_TAG);
  return {};
}
