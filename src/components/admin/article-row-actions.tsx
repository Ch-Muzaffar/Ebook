"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteArticleAction, unpublishArticleAction } from "@/lib/blog/actions";

const btn = "inline-flex min-h-9 items-center rounded-md px-3 text-small transition-colors disabled:pointer-events-none disabled:opacity-50";

export function ArticleRowActions({ id, slug, title, live, status }: { id: string; slug: string; title: string; live: boolean; status: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      setError("");
      try {
        await fn();
        setConfirming(false);
        router.refresh();
      } catch {
        setError("Action failed. Please try again.");
      }
    });

  if (confirming)
    return (
      <div role="group" aria-label={`Confirm deleting ${title}`} className="flex flex-wrap items-center justify-end gap-1">
        <span className="mr-1 text-caption text-danger">Delete permanently?</span>
        <button type="button" disabled={pending} onClick={() => run(() => deleteArticleAction(id))} className={`${btn} bg-danger text-white hover:bg-danger/90`}>
          {pending ? "Deleting…" : "Delete"}
        </button>
        <button type="button" disabled={pending} onClick={() => setConfirming(false)} className={`${btn} hover:bg-beige`}>
          Cancel
        </button>
      </div>
    );

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <Link href={`/admin/articles/${id}`} className={`${btn} hover:bg-beige`} aria-label={`Edit ${title}`}>
        Edit
      </Link>
      <Link href={`/admin/articles/${id}/preview`} className={`${btn} hover:bg-beige`} aria-label={`Preview ${title}`}>
        Preview
      </Link>
      {live && (
        <Link href={`/blog/${slug}`} target="_blank" className={`${btn} hover:bg-beige`} aria-label={`View ${title} on the site (opens in new tab)`}>
          View
        </Link>
      )}
      {status !== "draft" && (
        <button type="button" disabled={pending} onClick={() => run(() => unpublishArticleAction(id))} className={`${btn} hover:bg-beige`} aria-label={`Unpublish ${title}`}>
          {status === "scheduled" && !live ? "Unschedule" : "Unpublish"}
        </button>
      )}
      <button type="button" disabled={pending} onClick={() => setConfirming(true)} className={`${btn} text-danger hover:bg-danger/10`} aria-label={`Delete ${title}`}>
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
