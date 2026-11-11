/** Database rows (snake_case) ⇄ app types (camelCase). One place, so the UI never sees column names. */
import type { Category } from "@/lib/categories/types";
import type { Article, Product } from "@/lib/content/types";

type Row = Record<string, unknown>;
const opt = <T>(v: unknown) => (v === null || v === undefined ? undefined : (v as T));

export const PRODUCT_COLUMNS =
  "id, slug, title, subtitle, author, description, long_description, table_of_contents, price_cents, category_slug, format, pages, language, cover_image, cover_tone, featured, status, published_at, updated_at";

export function toProduct(r: Row): Product {
  const toc = (r.table_of_contents as string[] | null) ?? [];
  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    subtitle: opt(r.subtitle),
    author: r.author as string,
    description: r.description as string,
    longDescription: opt(r.long_description),
    tableOfContents: toc.length ? toc : undefined,
    priceCents: r.price_cents as number,
    category: r.category_slug as string,
    format: r.format as string,
    pages: opt(r.pages),
    language: opt(r.language),
    coverImage: opt(r.cover_image),
    coverTone: r.cover_tone as Product["coverTone"],
    featured: Boolean(r.featured),
    status: r.status as Product["status"],
    publishedAt: opt(r.published_at),
    updatedAt: r.updated_at as string,
  };
}

export function fromProduct(p: Omit<Product, "id" | "updatedAt">): Row {
  return {
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle ?? null,
    author: p.author,
    description: p.description,
    long_description: p.longDescription ?? null,
    table_of_contents: p.tableOfContents ?? [],
    price_cents: p.priceCents,
    category_slug: p.category,
    format: p.format,
    pages: p.pages ?? null,
    language: p.language ?? null,
    cover_image: p.coverImage ?? null,
    cover_tone: p.coverTone,
    featured: Boolean(p.featured),
    status: p.status,
    published_at: p.publishedAt ?? null,
  };
}

export const ARTICLE_COLUMNS =
  "id, slug, title, excerpt, content, tags, featured_image, featured_image_alt, author, author_bio, status, publish_at, seo_title, seo_description, reading_minutes, updated_at, article_categories(category_slug, position)";

export function toArticle(r: Row): Article {
  const links = ((r.article_categories as { category_slug: string; position: number }[] | null) ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);
  return {
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    excerpt: r.excerpt as string,
    content: r.content as string,
    categories: links.map((l) => l.category_slug),
    tags: (r.tags as string[] | null) ?? [],
    featuredImage: opt(r.featured_image),
    featuredImageAlt: opt(r.featured_image_alt),
    author: r.author as string,
    authorBio: opt(r.author_bio),
    status: r.status as Article["status"],
    publishAt: opt(r.publish_at),
    seoTitle: opt(r.seo_title),
    seoDescription: opt(r.seo_description),
    readingMinutes: r.reading_minutes as number,
    updatedAt: r.updated_at as string,
  };
}

export function fromArticle(a: Omit<Article, "id" | "updatedAt" | "categories">): Row {
  return {
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    content: a.content,
    tags: a.tags,
    featured_image: a.featuredImage ?? null,
    featured_image_alt: a.featuredImageAlt ?? null,
    author: a.author,
    author_bio: a.authorBio ?? null,
    status: a.status,
    publish_at: a.publishAt ?? null,
    seo_title: a.seoTitle ?? null,
    seo_description: a.seoDescription ?? null,
    reading_minutes: a.readingMinutes,
  };
}

export const CATEGORY_COLUMNS = "id, slug, name, description, sort_order";

export function toCategory(r: Row): Category {
  return { id: r.id as string, slug: r.slug as string, name: r.name as string, description: opt(r.description), order: r.sort_order as number };
}

/** Throws a readable error for a failed Supabase call (message is safe to log, never shown raw to visitors). */
export function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}
