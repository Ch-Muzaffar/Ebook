"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
import { BookCover } from "@/components/cards/book-cover";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState, LoadingIndicator } from "@/components/ui/states";
import { useBagItems } from "@/lib/cart/cart-store";
import type { Product } from "@/lib/content/types";
import { formatPrice } from "@/lib/format";
import { startCheckoutAction } from "@/lib/orders/actions";

const noop = () => () => {};

/** Review + pay. Shows what will be charged (from the catalog), skipping books already owned. */
export function CheckoutView({ catalog, ownedSlugs, signedIn, paymentsReady }: { catalog: Product[]; ownedSlugs: string[]; signedIn: boolean; paymentsReady: boolean }) {
  const slugs = useBagItems();
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  if (!hydrated) return <LoadingIndicator label="Loading your bag" />;
  const lines = slugs.map((s) => catalog.find((p) => p.slug === s)).filter((p): p is Product => Boolean(p));
  const toBuy = lines.filter((p) => !ownedSlugs.includes(p.slug));
  const owned = lines.filter((p) => ownedSlugs.includes(p.slug));
  const subtotal = toBuy.reduce((s, p) => s + p.priceCents, 0);

  if (!lines.length)
    return <EmptyState title="Your bag is empty" description="Add a book to check out." action={<LinkButton href="/books">Explore Books</LinkButton>} />;

  if (!signedIn)
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-10 text-center">
        <p className="font-serif text-h3">Sign in to complete your purchase</p>
        <p className="text-muted">Your books are added to your account so you can download them any time.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <LinkButton href="/login?next=%2Fcheckout">Sign in</LinkButton>
          <LinkButton href="/register?next=%2Fcheckout" variant="secondary">Create account</LinkButton>
        </div>
      </div>
    );

  const pay = () =>
    start(async () => {
      setError("");
      const r = await startCheckoutAction([...slugs]);
      if (r.url) window.location.assign(r.url);
      else setError(r.error ?? "Something went wrong.");
    });

  return (
    <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section aria-labelledby="review-heading">
        <h2 id="review-heading" className="mb-4 font-serif text-h4">Review your order</h2>
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {lines.map((p) => (
            <li key={p.id} className="flex items-center gap-4 py-4">
              <div className="w-14 shrink-0">
                <BookCover product={p} sizes="56px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-h4">{p.title}</p>
                <p className="text-caption text-muted">{p.format} · Digital download</p>
              </div>
              {ownedSlugs.includes(p.slug) ? (
                <span className="rounded-pill bg-success/10 px-3 py-1 text-caption text-success">Already in your library</span>
              ) : (
                <span className="font-medium">{formatPrice(p.priceCents)}</span>
              )}
            </li>
          ))}
        </ul>
        {owned.length > 0 && <p className="mt-3 text-caption text-muted">Books you already own won&apos;t be charged again.</p>}
      </section>

      <aside className="glass flex flex-col gap-5 rounded-lg p-6 lg:sticky lg:top-[calc(var(--spacing-header)+2rem)]">
        <h2 className="font-serif text-h4">Payment</h2>
        <dl className="flex flex-col gap-2 text-small">
          <div className="flex justify-between">
            <dt className="text-muted">{toBuy.length} {toBuy.length === 1 ? "book" : "books"}</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-muted">
            <dt>Tax</dt>
            <dd>Calculated by our payment provider</dd>
          </div>
        </dl>
        {error && <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-small text-danger">{error}</p>}
        {!paymentsReady ? (
          <p className="rounded-md bg-gold/15 px-3 py-2 text-small">Payments are being set up — please check back soon.</p>
        ) : toBuy.length ? (
          <Button size="lg" onClick={pay} disabled={pending}>
            {pending ? "Opening secure checkout…" : `Pay ${formatPrice(subtotal)} securely`}
          </Button>
        ) : (
          <LinkButton href="/dashboard" size="lg">Go to my library</LinkButton>
        )}
        <p className="text-caption text-muted">
          You&apos;ll complete payment on a secure page by Lemon Squeezy, our payment provider (cards, PayPal and more). We never see or store your card details.
          Downloads appear in <Link href="/dashboard" className="underline">My library</Link> as soon as payment is confirmed.
        </p>
      </aside>
    </div>
  );
}
