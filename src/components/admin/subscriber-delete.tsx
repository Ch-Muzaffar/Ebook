"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSubscriberAction } from "@/lib/newsletter/actions";

export function SubscriberDelete({ id, email }: { id: string; email: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!confirm)
    return (
      <button type="button" onClick={() => setConfirm(true)} className="min-h-9 rounded-md px-3 text-small text-danger hover:bg-danger/10" aria-label={`Delete ${email}`}>
        Delete
      </button>
    );
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => { await deleteSubscriberAction(id); router.refresh(); })}
        className="min-h-9 rounded-md bg-danger px-3 text-small text-white disabled:opacity-50"
      >
        Confirm delete
      </button>
      <button type="button" onClick={() => setConfirm(false)} className="min-h-9 rounded-md px-3 text-small hover:bg-beige">
        Cancel
      </button>
    </span>
  );
}
