"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { BookCover } from "@/components/cards/book-cover";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState, LoadingIndicator } from "@/components/ui/states";
import { bag, useBagItems } from "@/lib/cart/cart-store";
import type { Product } from "@/lib/content/types";
import { formatPrice } from "@/lib/format";

const noopSubscribe = () => () => {};

/**
 * Bag contents. Titles and prices come from the published catalog passed in by the server —
 * never from what's stored in the browser. Books that were unpublished are dropped.
 */
export function CartView({ catalog }: { catalog: Product[] }) {
  const slugs = useBagItems();
  // false during server render + hydration; true once the stored bag has been read.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const lines = slugs.map((s) => catalog.find((p) => p.slug === s)).filter((p): p is Product => Boolean(p));
  const missing = slugs.filter((s) => !catalog.some((p) => p.slug === s));
  const subtotal = lines.reduce((sum, p) => sum + p.priceCents, 0);

  useEffect(() => {
    missing.forEach((s) => bag.remove(s));
  }, [missing]);

  if (!hydrated) return <LoadingIndicator label="Loading your bag" />;

  if (!lines.length)
    return (
      <EmptyState
        title="Your bag is empty"
        description="Browse the collection and add a book to get started."
        action={<LinkButton href="/books">Explore Books</LinkButton>}
      />
    );

  return (
    <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-labelledby="bag-items-heading">
        <h2 id="bag-items-heading" className="sr-only">
          Items
        </h2>
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {lines.map((p) => (
            <li key={p.id} className="flex gap-5 py-6">
              <Link href={`/books/${p.slug}`} className="w-20 shrink-0 sm:w-24" tabIndex={-1} aria-hidden>
                <BookCover product={p} sizes="96px" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={`/books/${p.slug}`} className="font-serif text-h4 hover:text-gold-deep">
                  {p.title}
                </Link>
                <p className="text-small text-muted">{p.author}</p>
                <p className="text-caption text-muted">{p.format} · Digital download</p>
                <div className="mt-auto flex items-center justify-between gap-4 pt-3">
                  <p className="font-medium">{formatPrice(p.priceCents)}</p>
                  <Button variant="ghost" size="sm" onClick={() => bag.remove(p.slug)} aria-label={`Remove ${p.title}`}>
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <aside aria-labelledby="summary-heading" className="glass flex flex-col gap-5 rounded-lg p-6 lg:sticky lg:top-[calc(var(--spacing-header)+2rem)]">
        <h2 id="summary-heading" className="font-serif text-h4">
          Summary
        </h2>
        <dl className="flex flex-col gap-3 text-small">
          <div className="flex justify-between">
            <dt className="text-muted">
              {lines.length} {lines.length === 1 ? "book" : "books"}
            </dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-body font-medium">
            <dt>Subtotal</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
        </dl>
        <p className="text-caption text-muted">Any applicable taxes are calculated at checkout. Prices in USD.</p>
        <LinkButton href="/checkout" size="lg">
          Continue to checkout
        </LinkButton>
        <LinkButton href="/books" variant="ghost" size="sm">
          Continue browsing
        </LinkButton>
      </aside>
    </div>
  );
}
