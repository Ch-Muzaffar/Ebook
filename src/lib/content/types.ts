export type CoverTone = "charcoal" | "gold" | "beige";
export type ProductStatus = "draft" | "published";

/** Shape mirrors the planned Supabase `products` table (PRD §12.2). */
export type Product = {
  /** Stable identifier (slugs can change). */
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  author: string;
  /** Short summary used on cards and in metadata. */
  description: string;
  /** Full description; paragraphs separated by blank lines. */
  longDescription?: string;
  tableOfContents?: string[];
  /** Price in the smallest currency unit (cents) to avoid float rounding. */
  priceCents: number;
  /** Category slug (see data/categories.json). */
  category: string;
  format: string;
  pages?: number;
  language?: string;
  coverImage?: string;
  /** Tint of the typographic placeholder cover when no image exists. */
  coverTone: CoverTone;
  featured?: boolean;
  status: ProductStatus;
  publishedAt?: string; // ISO date
  updatedAt: string; // ISO timestamp
};

export type ArticleStatus = "draft" | "scheduled" | "published";

/** Shape mirrors the planned Supabase `articles` + `article_categories` tables (PRD §12.2). */
export type Article = {
  id: string;
  slug: string;
  title: string;
  /** Summary for cards, the article intro and the default meta description. */
  excerpt: string;
  /** Markdown body. Rendered safely (raw HTML is never rendered). */
  content: string;
  /** Category slugs; the first is the primary category. */
  categories: string[];
  tags: string[];
  featuredImage?: string;
  featuredImageAlt?: string;
  author: string;
  authorBio?: string;
  status: ArticleStatus;
  /** When the article goes (or went) live — ISO timestamp. Required unless draft. */
  publishAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  readingMinutes: number;
  updatedAt: string;
};
