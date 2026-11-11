"use client";

import Link from "next/link";
import { BagIcon } from "@/components/layout/icons";
import { useBagItems } from "@/lib/cart/cart-store";

/** Header bag icon with a live item count. */
export function BagLink() {
  const count = useBagItems().length;
  return (
    <Link
      href="/cart"
      aria-label={count ? `Shopping bag, ${count} ${count === 1 ? "item" : "items"}` : "Shopping bag"}
      className="relative inline-flex size-11 items-center justify-center rounded-pill text-charcoal hover:bg-charcoal/8"
    >
      <BagIcon />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute right-1 top-1 flex min-w-4.5 items-center justify-center rounded-pill bg-gold-deep px-1 text-[0.625rem] font-semibold leading-4.5 text-ivory"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
