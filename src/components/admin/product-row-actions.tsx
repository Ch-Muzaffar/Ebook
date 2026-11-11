"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProductAction, setProductStatusAction } from "@/lib/catalog/actions";
import type { ProductStatus } from "@/lib/content/types";

const btn =
  "inline-flex min-h-9 items-center rounded-md px-3 text-small transition-colors disabled:opacity-50 disabled:pointer-events-none";

/** Edit / publish toggle / delete (two-step confirm, no browser dialog). */
export function ProductRowActions({ id, slug, title, status }: { id: string; slug: string; title: string; status: ProductStatus }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      setError("");
      try {
        const result = (await fn()) as { error?: string } | void;
        setConfirming(false);
        if (result && result.error) return setError(result.error);
        router.refresh(); // re-read the (uncached) admin list
      } catch {
        setError("Action failed. Please try again.");
      }
    });

  if (confirming)
    return (
      <div className="flex flex-wrap items-center justify-end gap-1" role="group" aria-label={`Confirm deleting ${title}`}>
        <span className="mr-1 text-caption text-danger">Delete permanently?</span>
        <button type="button" className={`${btn} bg-danger text-white hover:bg-danger/90`} disabled={pending} onClick={() => run(() => deleteProductAction(id))}>
          {pending ? "Deleting…" : "Delete"}
        </button>
        <button type="button" className={`${btn} hover:bg-beige`} disabled={pending} onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </div>
    );

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <Link href={`/admin/products/${id}`} className={`${btn} hover:bg-beige`} aria-label={`Edit ${title}`}>
        Edit
      </Link>
      {status === "published" && (
        <Link href={`/books/${slug}`} target="_blank" className={`${btn} hover:bg-beige`} aria-label={`View ${title} on the site (opens in new tab)`}>
          View
        </Link>
      )}
      <button
        type="button"
        className={`${btn} hover:bg-beige`}
        disabled={pending}
        aria-label={`${status === "published" ? "Unpublish" : "Publish"} ${title}`}
        onClick={() => run(() => setProductStatusAction(id, status === "published" ? "draft" : "published"))}
      >
        {status === "published" ? "Unpublish" : "Publish"}
      </button>
      <button type="button" className={`${btn} text-danger hover:bg-danger/10`} disabled={pending} onClick={() => setConfirming(true)} aria-label={`Delete ${title}`}>
        Delete
      </button>
      {error && (
        <span role="alert" className="w-full text-right text-caption text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
