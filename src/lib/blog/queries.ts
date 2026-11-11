import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import type { Article } from "@/lib/content/types";
import { ARTICLE_COLUMNS, must, toArticle } from "@/lib/supabase/mappers";
import { publicDb } from "@/lib/supabase/public";
import { findArticle, listAllArticles } from "./article-store";

export const ARTICLES_TAG = "articles";

/** Live = not a draft and its publish time has passed (covers scheduled posts going live). */
export function isLive(a: Article, now = Date.now()) {
  return a.status !== "draft" && !!a.publishAt && Date.parse(a.publishAt) <= now;
}

/**
 * Public articles, newest first. Row Level Security returns only live articles; the cache is
 * re-checked every few minutes so scheduled articles go live on time ("minutes" profile).
 */
export async function getPublishedArticles(): Promise<Article[]> {
  "use cache";
  cacheTag(ARTICLES_TAG);
  cacheLife("minutes");
  const rows = must(await publicDb().from("articles").select(ARTICLE_COLUMNS).order("publish_at", { ascending: false }), "published articles");
  const now = Date.now();
  return rows.map(toArticle).filter((a) => isLive(a, now)); // RLS already filters; double-check costs nothing
}

export async function getPublishedArticle(slug: string) {
  return (await getPublishedArticles()).find((a) => a.slug === slug);
}

export async function getLatestArticles(limit = 3) {
  return (await getPublishedArticles()).slice(0, limit);
}

export async function getArticlesInCategory(slug: string) {
  return (await getPublishedArticles()).filter((a) => a.categories.includes(slug));
}

/** Score by shared categories (×2) and tags; newest wins ties. */
export async function getRelatedArticles(article: Article, limit = 3) {
  return (await getPublishedArticles())
    .filter((a) => a.id !== article.id)
    .map((a) => ({
      a,
      score:
        a.categories.filter((c) => article.categories.includes(c)).length * 2 +
        a.tags.filter((t) => article.tags.includes(t)).length,
    }))
    .sort((x, y) => y.score - x.score || (y.a.publishAt ?? "").localeCompare(x.a.publishAt ?? ""))
    .slice(0, limit)
    .map((x) => x.a);
}

/** Admin: everything including drafts and scheduled, always fresh, with live state resolved now. */
export async function getAllArticlesForAdmin(): Promise<(Article & { live: boolean })[]> {
  await connection(); // admin data is always read at request time, never prerendered
  const now = Date.now();
  return (await listAllArticles()).map((a) => ({ ...a, live: isLive(a, now) }));
}

export async function getArticleForAdmin(id: string) {
  await connection();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  return findArticle(id);
}
