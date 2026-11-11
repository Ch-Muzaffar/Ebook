import Image from "next/image";
import type { Product } from "@/lib/content/types";
import { cn } from "@/lib/cn";

const tones: Record<Product["coverTone"], string> = {
  // Fixed (non-theme) colours: a printed cover looks the same in light and dark mode.
  charcoal: "bg-ink text-paper",
  gold: "bg-brass text-ink",
  beige: "bg-parchment text-ink",
};

/**
 * Renders the real cover when one exists, otherwise a typographic placeholder
 * cover in the brand palette (2:3 book ratio — no layout shift either way).
 */
export function BookCover({ product, className, sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 90vw" }: {
  product: Pick<Product, "title" | "author" | "coverTone" | "coverImage">;
  className?: string;
  sizes?: string;
}) {
  return (
    <div className={cn("@container relative aspect-[2/3] w-full overflow-hidden rounded-sm shadow-book", className)}>
      {product.coverImage ? (
        <Image
          src={product.coverImage}
          alt={`Cover of ${product.title}`}
          fill
          sizes={sizes}
          // External https:// covers are served as-is (no remote host allow-list needed until storage in Phase 5).
          unoptimized={product.coverImage.startsWith("http")}
          className="object-cover"
        />
      ) : (
        // Type is sized in container units (cqw) so the cover reads the same at any size,
        // from a 36px admin thumbnail to a full product-page cover.
        <div className={cn("flex h-full flex-col justify-between p-[8%]", tones[product.coverTone])} aria-hidden>
          <span className="h-px w-1/4 bg-current opacity-40" />
          <span className="line-clamp-4 font-serif text-[10cqw] leading-tight">{product.title}</span>
          <span className="truncate text-[4.6cqw] uppercase tracking-[0.16em] opacity-70">{product.author}</span>
        </div>
      )}
    </div>
  );
}
