"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { bag, useBagItems } from "@/lib/cart/cart-store";

export function AddToBagButton({ slug, title }: { slug: string; title: string }) {
  const items = useBagItems();
  const inBag = items.includes(slug);
  const [justAdded, setJustAdded] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {inBag ? (
          <Link
            href="/cart"
            className="inline-flex min-h-14 items-center justify-center rounded-pill bg-charcoal px-9 text-body font-medium tracking-wide text-ivory hover:bg-charcoal-soft"
          >
            View bag
          </Link>
        ) : (
          <Button
            size="lg"
            onClick={() => {
              bag.add(slug);
              setJustAdded(true);
            }}
          >
            Add to bag
          </Button>
        )}
        {inBag && (
          <Button variant="ghost" size="sm" onClick={() => bag.remove(slug)}>
            Remove
          </Button>
        )}
      </div>
      <p aria-live="polite" className="min-h-5 text-caption text-muted">
        {inBag ? (justAdded ? `“${title}” was added to your bag.` : "This book is in your bag.") : ""}
      </p>
    </div>
  );
}
