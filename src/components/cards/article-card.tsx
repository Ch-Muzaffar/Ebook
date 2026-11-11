import Image from "next/image";
import Link from "next/link";
import { CategoryName } from "@/components/categories/categories-provider";
import { cn } from "@/lib/cn";
import type { Article } from "@/lib/content/types";
import { formatDate } from "@/lib/format";

export function ArticleCard({ article, size = "default" }: { article: Article; size?: "default" | "lead" }) {
  const primary = article.categories[0];
  const lead = size === "lead";
  return (
    <article className={cn("group relative flex flex-col gap-5", lead && "md:grid md:grid-cols-2 md:items-center md:gap-12")}>
      <div className="relative aspect-[3/2] overflow-hidden rounded-lg bg-beige shadow-hairline transition-shadow duration-(--duration-scene) ease-editorial group-hover:shadow-lift">
        {/* Warm vignette + gold edge that fade in on hover. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-lg bg-[linear-gradient(to_top,color-mix(in_oklab,var(--color-ink)_40%,transparent),transparent_55%)] opacity-0 ring-1 ring-gold/0 ring-inset transition-[opacity,box-shadow] duration-(--duration-scene) ease-editorial group-hover:opacity-100 group-hover:ring-gold/50"
        />
        {article.featuredImage ? (
          <Image
            src={article.featuredImage}
            alt=""
            fill
            unoptimized={article.featuredImage.startsWith("http")}
            sizes={lead ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
            className="object-cover transition-transform duration-(--duration-scene) ease-editorial group-hover:scale-[1.03]"
          />
        ) : (
          <div aria-hidden className="flex h-full items-center justify-center">
            <span className="font-serif text-h2 text-gold/60">{article.title.charAt(0)}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <p className="flex flex-wrap items-center gap-x-3 text-eyebrow font-medium uppercase">
          {primary && (
            <span className="text-gold-deep">
              <CategoryName slug={primary} />
            </span>
          )}
          <span aria-hidden className="text-line">
            /
          </span>
          <span className="text-muted">{article.readingMinutes} min read</span>
        </p>
        <h3 className={cn("font-serif text-charcoal text-balance", lead ? "text-h2" : "text-h4")}>
          <Link
            href={`/blog/${article.slug}`}
            className="after:absolute after:inset-0 group-hover:underline group-hover:decoration-gold group-hover:underline-offset-4 focus-visible:outline-none"
          >
            {article.title}
          </Link>
        </h3>
        <p className={cn("text-muted", lead ? "text-body line-clamp-3" : "text-small line-clamp-2")}>{article.excerpt}</p>
        {article.publishAt && (
          <p className="text-caption text-muted">
            <time dateTime={article.publishAt}>{formatDate(article.publishAt)}</time>
          </p>
        )}
      </div>
      <span
        aria-hidden
        data-focus-ring
        className="pointer-events-none absolute -inset-2 rounded-lg outline-offset-2 outline-charcoal group-has-[a:focus-visible]:outline-2"
      />
    </article>
  );
}
