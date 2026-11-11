import Link from "next/link";
import { ViewTransition } from "react";
import type { Product } from "@/lib/content/types";
import { CategoryName } from "@/components/categories/categories-provider";
import { formatPrice } from "@/lib/format";
import { Book3D } from "./book-3d";
import { BookCover } from "./book-cover";

/** Whole card is one link (single tab stop); title is the accessible name. */
export function ProductCard({ product }: { product: Product }) {
  return (
    <article data-book-hover className="group relative flex flex-col gap-5">
      <div className="glass relative overflow-hidden rounded-lg px-[16%] py-[13%] transition-transform duration-(--duration-slow) ease-editorial group-hover:-translate-y-1">
        {/* Warm spotlight behind the book */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_42%,color-mix(in_oklab,var(--color-gold)_22%,transparent),transparent)] opacity-60 transition-opacity duration-(--duration-slow) group-hover:opacity-100"
        />
        {/* Same name as the cover on the book page → the cover morphs between the two pages. */}
        <ViewTransition name={`book-${product.slug}`} share="morph" default="none">
          <div>
            <Book3D tone={product.coverTone} rest={-14} range={16}>
              <BookCover product={product} />
            </Book3D>
          </div>
        </ViewTransition>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-eyebrow font-medium uppercase text-gold-deep">
          <CategoryName slug={product.category} />
        </p>
        <h3 className="font-serif text-h4 text-charcoal">
          <Link href={`/books/${product.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {product.title}
          </Link>
        </h3>
        <p className="text-small text-muted">{product.author}</p>
        <p className="mt-1 text-small font-medium text-charcoal">{formatPrice(product.priceCents)}</p>
      </div>
      {/* Focus ring for the stretched link, drawn around the whole card. */}
      <span
        aria-hidden
        data-focus-ring
        className="pointer-events-none absolute -inset-2 rounded-lg outline-offset-2 outline-charcoal group-has-[a:focus-visible]:outline-2"
      />
    </article>
  );
}
