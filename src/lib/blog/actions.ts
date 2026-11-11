"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";
import { listAllCategories } from "@/lib/categories/store";
import * as store from "./article-store";
import { ARTICLES_TAG } from "./queries";
import { articleValuesFromFormData, parseArticleForm, type ArticleFormState } from "./validation";

const friendly = (e: unknown) =>
  e instanceof Error && /duplicate key|articles_slug_key/.test(e.message) ? "Another article already uses this URL slug." : "Could not save. Please try again.";

export async function createArticleAction(_prev: ArticleFormState, formData: FormData): Promise<ArticleFormState> {
  await requireAdmin();
  const parsed = parseArticleForm(formData, await store.listAllArticles(), await listAllCategories());
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values };
  try {
    await store.insertArticle(parsed.data);
  } catch (e) {
    console.error(e);
    return { errors: { form: friendly(e) }, values: articleValuesFromFormData(formData) };
  }
  updateTag(ARTICLES_TAG);
  redirect("/admin/articles?saved=created");
}

export async function updateArticleAction(id: string, _prev: ArticleFormState, formData: FormData): Promise<ArticleFormState> {
  await requireAdmin();
  const parsed = parseArticleForm(formData, await store.listAllArticles(), await listAllCategories(), id);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values };
  try {
    await store.updateArticle(id, parsed.data);
  } catch (e) {
    console.error(e);
    return { errors: { form: friendly(e) }, values: articleValuesFromFormData(formData) };
  }
  updateTag(ARTICLES_TAG);
  redirect("/admin/articles?saved=updated");
}

/** Quick unpublish → draft (keeps content). Publishing is done in the editor (now or scheduled). */
export async function unpublishArticleAction(id: string) {
  await requireAdmin();
  await store.unpublishArticle(id);
  updateTag(ARTICLES_TAG);
}

export async function deleteArticleAction(id: string) {
  await requireAdmin();
  await store.deleteArticle(id);
  updateTag(ARTICLES_TAG);
}
