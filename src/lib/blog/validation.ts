import { slugify } from "@/lib/catalog/validation";
import type { Category } from "@/lib/categories/types";
import type { Article, ArticleStatus } from "@/lib/content/types";

export type ArticleFormValues = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categories: string[];
  tags: string;
  featuredImage: string;
  featuredImageAlt: string;
  author: string;
  authorBio: string;
  status: string;
  /** ISO timestamp (converted from the browser's local time by the form). */
  publishAt: string;
  seoTitle: string;
  seoDescription: string;
};
export type ArticleFormErrors = Partial<Record<keyof ArticleFormValues | "form", string>>;
export type ArticleFormState = { errors: ArticleFormErrors; values: ArticleFormValues } | undefined;
export type ArticleInput = Omit<Article, "id" | "updatedAt">;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STATUSES: ArticleStatus[] = ["draft", "scheduled", "published"];
const WORDS_PER_MINUTE = 220;

export function readingMinutes(markdown: string) {
  const words = markdown.replace(/[#>*_`|[\]()-]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function formValuesFromArticle(a?: Article): ArticleFormValues {
  return {
    title: a?.title ?? "",
    slug: a?.slug ?? "",
    excerpt: a?.excerpt ?? "",
    content: a?.content ?? "",
    categories: a?.categories ?? [],
    tags: (a?.tags ?? []).join(", "),
    featuredImage: a?.featuredImage ?? "",
    featuredImageAlt: a?.featuredImageAlt ?? "",
    author: a?.author ?? "",
    authorBio: a?.authorBio ?? "",
    status: a?.status ?? "draft",
    publishAt: a?.publishAt ?? "",
    seoTitle: a?.seoTitle ?? "",
    seoDescription: a?.seoDescription ?? "",
  };
}

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};

/** Reads the submitted form into form values (used to re-fill the form after any error). */
export function articleValuesFromFormData(fd: FormData): ArticleFormValues {
  return {
    title: str(fd, "title"),
    slug: str(fd, "slug"),
    excerpt: str(fd, "excerpt"),
    content: typeof fd.get("content") === "string" ? (fd.get("content") as string).replace(/\r\n/g, "\n").trim() : "",
    categories: fd.getAll("categories").filter((v): v is string => typeof v === "string"),
    tags: str(fd, "tags"),
    featuredImage: str(fd, "featuredImage"),
    featuredImageAlt: str(fd, "featuredImageAlt"),
    author: str(fd, "author"),
    authorBio: str(fd, "authorBio"),
    status: str(fd, "status"),
    publishAt: str(fd, "publishAt"),
    seoTitle: str(fd, "seoTitle"),
    seoDescription: str(fd, "seoDescription"),
  };
}

/** Server-side validation for the admin article form (the browser is never trusted). */
export function parseArticleForm(
  fd: FormData,
  existing: Article[],
  categories: Category[],
  currentId?: string,
): { ok: true; data: ArticleInput } | { ok: false; errors: ArticleFormErrors; values: ArticleFormValues } {
  const values = articleValuesFromFormData(fd);
  if (!values.slug) values.slug = slugify(values.title);

  const errors: ArticleFormErrors = {};
  const need = (k: "title" | "excerpt" | "author", label: string, max: number) => {
    if (!values[k]) errors[k] = `${label} is required.`;
    else if (values[k].length > max) errors[k] = `${label} must be ${max} characters or fewer.`;
  };
  need("title", "Title", 150);
  need("excerpt", "Excerpt", 300);
  need("author", "Author", 120);
  if (!values.content) errors.content = "Write the article content.";
  else if (values.content.length > 100_000) errors.content = "Content is too long (100,000 characters max).";
  if (values.authorBio.length > 400) errors.authorBio = "Author bio must be 400 characters or fewer.";

  if (!SLUG.test(values.slug)) errors.slug = "Use lowercase letters, numbers and single hyphens (e.g. my-article).";
  else if (existing.some((a) => a.slug === values.slug && a.id !== currentId)) errors.slug = "Another article already uses this URL slug.";

  const validCats = values.categories.filter((c) => categories.some((x) => x.slug === c));
  if (!validCats.length) errors.categories = "Choose at least one category.";
  else if (validCats.length > 3) errors.categories = "Choose up to three categories.";

  const tags = [...new Set(values.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))];
  if (tags.length > 10) errors.tags = "Up to 10 tags.";
  else if (tags.some((t) => t.length > 30 || !/^[\p{L}\p{N}][\p{L}\p{N} -]*$/u.test(t)))
    errors.tags = "Tags may contain letters, numbers, spaces and hyphens (30 characters max each).";

  if (values.featuredImage && !/^(\/[^\s]*|https:\/\/[^\s]+)$/.test(values.featuredImage))
    errors.featuredImage = "Use a site path (/images/photo.jpg) or an https:// URL.";
  if (values.featuredImage && !values.featuredImageAlt)
    errors.featuredImageAlt = "Describe the image for screen readers (or leave the image empty).";

  if (!STATUSES.includes(values.status as ArticleStatus)) errors.status = "Choose a status.";
  const status = values.status as ArticleStatus;
  const at = values.publishAt ? Date.parse(values.publishAt) : NaN;
  if (status === "scheduled") {
    if (Number.isNaN(at)) errors.publishAt = "Choose when the article should go live.";
    else if (at <= Date.now()) errors.publishAt = "Scheduled time must be in the future (or choose Publish now).";
  } else if (values.publishAt && Number.isNaN(at)) errors.publishAt = "Invalid date.";

  if (values.seoTitle.length > 70) errors.seoTitle = "Keep the SEO title to 70 characters or fewer.";
  if (values.seoDescription.length > 160) errors.seoDescription = "Keep the SEO description to 160 characters or fewer.";

  if (Object.keys(errors).length) return { ok: false, errors, values };

  const previous = existing.find((a) => a.id === currentId);
  let publishAt: string | undefined;
  if (status === "scheduled") publishAt = new Date(at).toISOString();
  else if (status === "published")
    // Keep the original date when re-saving a live article; otherwise publish now.
    publishAt = previous?.status === "published" && previous.publishAt ? previous.publishAt : new Date().toISOString();
  else publishAt = undefined;

  return {
    ok: true,
    data: {
      slug: values.slug,
      title: values.title,
      excerpt: values.excerpt,
      content: values.content,
      categories: validCats,
      tags,
      featuredImage: values.featuredImage || undefined,
      featuredImageAlt: values.featuredImage ? values.featuredImageAlt : undefined,
      author: values.author,
      authorBio: values.authorBio || undefined,
      status,
      publishAt,
      seoTitle: values.seoTitle || undefined,
      seoDescription: values.seoDescription || undefined,
      readingMinutes: readingMinutes(values.content),
    },
  };
}
