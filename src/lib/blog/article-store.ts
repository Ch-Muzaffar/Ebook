import "server-only";

import type { Article } from "@/lib/content/types";
import { ARTICLE_COLUMNS, fromArticle, must, toArticle } from "@/lib/supabase/mappers";
import { sessionDb } from "@/lib/supabase/server";
import type { ArticleInput } from "./validation";

/** Admin article storage (Supabase, session client → RLS requires admin). */
export async function listAllArticles(): Promise<Article[]> {
  const db = await sessionDb();
  return must(await db.from("articles").select(ARTICLE_COLUMNS).order("updated_at", { ascending: false }), "list articles").map(toArticle);
}

export async function findArticle(id: string): Promise<Article | undefined> {
  const db = await sessionDb();
  const row = must(await db.from("articles").select(ARTICLE_COLUMNS).eq("id", id).maybeSingle(), "get article");
  return row ? toArticle(row) : undefined;
}

async function setCategories(id: string, slugs: string[]) {
  const db = await sessionDb();
  must(await db.rpc("set_article_categories", { p_article_id: id, p_slugs: slugs }), "set article categories");
}

export async function insertArticle(input: ArticleInput): Promise<string> {
  const db = await sessionDb();
  const { id } = must<{ id: string }>(await db.from("articles").insert(fromArticle(input)).select("id").single(), "create article");
  await setCategories(id, input.categories);
  return id;
}

export async function updateArticle(id: string, input: ArticleInput) {
  const db = await sessionDb();
  must(await db.from("articles").update(fromArticle(input)).eq("id", id).select("id").single(), "update article");
  await setCategories(id, input.categories);
}

export async function unpublishArticle(id: string) {
  const db = await sessionDb();
  must(await db.from("articles").update({ status: "draft", publish_at: null }).eq("id", id).select("id").single(), "unpublish article");
}

export async function deleteArticle(id: string) {
  const db = await sessionDb();
  must(await db.from("articles").delete().eq("id", id).select("id").single(), "delete article");
}
