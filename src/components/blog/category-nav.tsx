import Link from "next/link";
import type { Category } from "@/lib/categories/types";
import { cn } from "@/lib/cn";

/** Category links for the blog (real pages, so search engines can crawl each category). */
export function BlogCategoryNav({ categories, active }: { categories: Category[]; active?: string }) {
  return (
    <nav aria-label="Blog categories">
      <ul className="flex flex-wrap gap-2">
        {[{ slug: "", name: "All articles" }, ...categories].map((c) => {
          const isActive = (active ?? "") === c.slug;
          return (
            <li key={c.slug || "all"}>
              <Link
                href={c.slug ? `/blog/category/${c.slug}` : "/blog"}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center rounded-pill border px-4 text-small transition-colors",
                  isActive ? "border-charcoal bg-charcoal text-ivory" : "border-line bg-white hover:border-muted",
                )}
              >
                {c.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
