"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/cards/product-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { useCategories } from "@/components/categories/categories-provider";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/content/types";

export const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "title", label: "Title A–Z" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

/** Pure filter + sort, exported for reuse/testing. Every search word must match somewhere. */
export function filterProducts(products: Product[], q: string, category: string, sort: Sort, categoryNames: Record<string, string> = {}) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = products.filter((p) => {
    if (category && p.category !== category) return false;
    if (!words.length) return true;
    const hay = [p.title, p.subtitle, p.author, p.description, categoryNames[p.category], p.format].join(" ").toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  const byNewest = (a: Product, b: Product) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
  const sorters: Record<Sort, (a: Product, b: Product) => number> = {
    featured: (a, b) => Number(!!b.featured) - Number(!!a.featured) || byNewest(a, b),
    newest: byNewest,
    "price-asc": (a, b) => a.priceCents - b.priceCents,
    "price-desc": (a, b) => b.priceCents - a.priceCents,
    title: (a, b) => a.title.localeCompare(b.title),
  };
  return [...matches].sort(sorters[sort]);
}

/**
 * Store browser: search, category filter and sort, all kept in the URL (?q=&category=&sort=)
 * so results are shareable and the back button works. Filtering runs in the browser over the
 * published catalog, which is small, so results update instantly with no round-trips.
 */
export function StoreBrowser({ products }: { products: Product[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // Only offer categories that actually contain published books.
  const allCategories = useCategories();
  const categories = allCategories.filter((c) => products.some((p) => p.category === c.slug));
  const names = Object.fromEntries(allCategories.map((c) => [c.slug, c.name]));
  const categoryName = (slug: string) => names[slug] ?? slug;

  const urlQ = params.get("q") ?? "";
  const category = categories.some((c) => c.slug === params.get("category")) ? params.get("category")! : "";
  const sortParam = params.get("sort");
  const sort: Sort = SORTS.some((s) => s.value === sortParam) ? (sortParam as Sort) : "featured";

  // Search box is local state (instant typing), pushed to the URL after a short pause.
  const [q, setQ] = useState(urlQ);
  const [lastUrlQ, setLastUrlQ] = useState(urlQ);
  if (urlQ !== lastUrlQ) {
    // URL changed externally (back button, "Clear filters") → sync the input.
    setLastUrlQ(urlQ);
    setQ(urlQ);
  }

  const update = (next: { q?: string; category?: string; sort?: string }) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v && !(k === "sort" && v === "featured")) sp.set(k, v);
      else sp.delete(k);
    }
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const updateRef = useRef(update);
  useEffect(() => {
    updateRef.current = update;
  });

  useEffect(() => {
    if (q === urlQ) return;
    const t = setTimeout(() => updateRef.current({ q: q.trim() }), 250);
    return () => clearTimeout(t);
  }, [q, urlQ]);

  // React Compiler memoizes this automatically; no manual useMemo needed.
  const results = filterProducts(products, q, category, sort, names);
  const filtered = Boolean(q.trim() || category);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="store-search" className="text-small font-medium">
              Search books
            </label>
            <input
              id="store-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Title, author or topic"
              autoComplete="off"
              className="min-h-12 w-full rounded-md border border-line bg-white px-4 text-body hover:border-muted focus-visible:border-charcoal focus-visible:outline-offset-1"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:w-56">
            <label htmlFor="store-sort" className="text-small font-medium">
              Sort by
            </label>
            <select
              id="store-sort"
              value={sort}
              onChange={(e) => update({ sort: e.target.value })}
              className="min-h-12 w-full rounded-md border border-line bg-white px-3 text-body hover:border-muted focus-visible:border-charcoal focus-visible:outline-offset-1"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          {[{ name: "All", slug: "" }, ...categories].map((c) => {
            const active = category === c.slug;
            return (
              <button
                key={c.slug || "all"}
                type="button"
                aria-pressed={active}
                onClick={() => update({ category: c.slug })}
                className={cn(
                  "min-h-10 rounded-pill border px-4 text-small transition-colors duration-(--duration-fast)",
                  active ? "border-charcoal bg-charcoal text-ivory" : "border-line bg-white text-charcoal hover:border-muted",
                )}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        <p aria-live="polite" className="text-small text-muted">
          {results.length} {results.length === 1 ? "book" : "books"}
          {category && ` in ${categoryName(category)}`}
          {q.trim() && ` matching “${q.trim()}”`}
        </p>
      </div>

      {results.length ? (
        <ProductGrid products={results} />
      ) : (
        <EmptyState
          title="No books match your search"
          description="Try a different word or another category."
          action={
            filtered ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setQ("");
                  update({ q: "", category: "" });
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}
