import type { MetadataRoute } from "next";
import { getPublishedArticles } from "@/lib/blog/queries";
import { getPublishedProducts } from "@/lib/catalog/queries";
import { getCategories } from "@/lib/categories/queries";
import { siteUrl } from "@/lib/site-url";

/**
 * /sitemap.xml — every public, indexable page (PRD §11). Built from the same cached queries as
 * the pages themselves, so it updates when books/articles are published. Private areas
 * (admin, account, checkout, cart) are deliberately excluded.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [products, articles, categories] = await Promise.all([getPublishedProducts(), getPublishedArticles(), getCategories()]);
  const latest = (dates: (string | undefined)[]) => dates.filter(Boolean).sort().at(-1);

  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/books`, changeFrequency: "weekly", priority: 0.9, lastModified: latest(products.map((p) => p.updatedAt)) },
    { url: `${base}/blog`, changeFrequency: "daily", priority: 0.9, lastModified: latest(articles.map((a) => a.publishAt)) },
    { url: `${base}/about`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/refund-policy`, changeFrequency: "yearly", priority: 0.2 },
  ];
  return [
    ...pages,
    ...products.map((p) => ({ url: `${base}/books/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...articles.map((a) => ({ url: `${base}/blog/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...categories
      .filter((c) => articles.some((a) => a.categories.includes(c.slug)))
      .map((c) => ({ url: `${base}/blog/category/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
