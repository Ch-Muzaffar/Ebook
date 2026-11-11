import type { Category } from "@/lib/categories/types";
import type { CoverTone, Product, ProductStatus } from "@/lib/content/types";
import type { ProductInput } from "./product-store";

export type ProductFormValues = Record<
  | "title" | "subtitle" | "slug" | "author" | "category" | "price" | "format" | "pages" | "language"
  | "description" | "longDescription" | "tableOfContents" | "coverImage" | "coverTone" | "status" | "featured",
  string
>;

export type ProductFormErrors = Partial<Record<keyof ProductFormValues | "form", string>>;

export type ProductFormState = { errors: ProductFormErrors; values: ProductFormValues } | undefined;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRICE = /^\d{1,5}(?:\.\d{1,2})?$/;
const TONES: CoverTone[] = ["charcoal", "gold", "beige"];
const STATUSES: ProductStatus[] = ["draft", "published"];

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formValuesFromProduct(p?: Product, defaultCategory = ""): ProductFormValues {
  return {
    title: p?.title ?? "",
    subtitle: p?.subtitle ?? "",
    slug: p?.slug ?? "",
    author: p?.author ?? "",
    category: p?.category ?? defaultCategory,
    price: p ? (p.priceCents / 100).toFixed(2) : "",
    format: p?.format ?? "PDF",
    pages: p?.pages ? String(p.pages) : "",
    language: p?.language ?? "English",
    description: p?.description ?? "",
    longDescription: p?.longDescription ?? "",
    tableOfContents: (p?.tableOfContents ?? []).join("\n"),
    coverImage: p?.coverImage ?? "",
    coverTone: p?.coverTone ?? "charcoal",
    status: p?.status ?? "draft",
    featured: p?.featured ? "on" : "",
  };
}

function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Server-side validation of the admin product form. Never trust the browser:
 * every field is re-checked here even though the form has its own constraints.
 */
export function parseProductForm(
  fd: FormData,
  existing: Product[],
  categories: Category[],
  currentId?: string,
): { ok: true; data: ProductInput } | { ok: false; errors: ProductFormErrors; values: ProductFormValues } {
  const values: ProductFormValues = {
    title: str(fd, "title"),
    subtitle: str(fd, "subtitle"),
    slug: str(fd, "slug"),
    author: str(fd, "author"),
    category: str(fd, "category"),
    price: str(fd, "price"),
    format: str(fd, "format"),
    pages: str(fd, "pages"),
    language: str(fd, "language"),
    description: str(fd, "description"),
    longDescription: str(fd, "longDescription"),
    tableOfContents: str(fd, "tableOfContents"),
    coverImage: str(fd, "coverImage"),
    coverTone: str(fd, "coverTone"),
    status: str(fd, "status"),
    featured: fd.get("featured") ? "on" : "",
  };
  if (!values.slug) values.slug = slugify(values.title);

  const errors: ProductFormErrors = {};
  const need = (k: keyof ProductFormValues, label: string, max: number) => {
    if (!values[k]) errors[k] = `${label} is required.`;
    else if (values[k].length > max) errors[k] = `${label} must be ${max} characters or fewer.`;
  };
  need("title", "Title", 120);
  need("author", "Author", 120);
  need("format", "Format", 40);
  need("description", "Short description", 300);
  if (values.subtitle.length > 160) errors.subtitle = "Subtitle must be 160 characters or fewer.";
  if (values.longDescription.length > 10000) errors.longDescription = "Full description is too long (10,000 characters max).";
  if (values.language.length > 40) errors.language = "Language must be 40 characters or fewer.";

  if (!SLUG.test(values.slug)) errors.slug = "Use lowercase letters, numbers and single hyphens (e.g. my-book).";
  else if (existing.some((p) => p.slug === values.slug && p.id !== currentId)) errors.slug = "Another book already uses this URL slug.";

  if (!categories.some((c) => c.slug === values.category)) errors.category = "Choose a category.";
  if (!PRICE.test(values.price)) errors.price = "Enter a price like 19 or 19.99.";
  if (values.pages && !/^\d{1,5}$/.test(values.pages)) errors.pages = "Pages must be a whole number.";
  if (values.coverImage && !/^(\/[^\s]*|https:\/\/[^\s]+)$/.test(values.coverImage))
    errors.coverImage = "Use a site path (/covers/book.jpg) or an https:// URL.";
  if (!TONES.includes(values.coverTone as CoverTone)) errors.coverTone = "Choose a cover colour.";
  if (!STATUSES.includes(values.status as ProductStatus)) errors.status = "Choose draft or published.";

  const toc = values.tableOfContents
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (toc.length > 100) errors.tableOfContents = "Up to 100 lines.";

  if (Object.keys(errors).length) return { ok: false, errors, values };

  const previous = existing.find((p) => p.id === currentId);
  const status = values.status as ProductStatus;
  return {
    ok: true,
    data: {
      slug: values.slug,
      title: values.title,
      subtitle: values.subtitle || undefined,
      author: values.author,
      description: values.description,
      longDescription: values.longDescription || undefined,
      tableOfContents: toc.length ? toc : undefined,
      priceCents: Math.round(Number(values.price) * 100),
      category: values.category,
      format: values.format,
      pages: values.pages ? Number(values.pages) : undefined,
      language: values.language || undefined,
      coverImage: values.coverImage || undefined,
      coverTone: values.coverTone as CoverTone,
      featured: values.featured === "on",
      status,
      // Keep the original publish date; set it the first time a book is published.
      publishedAt: status === "published" ? (previous?.publishedAt ?? new Date().toISOString().slice(0, 10)) : previous?.publishedAt,
    },
  };
}
