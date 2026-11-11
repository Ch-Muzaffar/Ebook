"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setRoleAction } from "@/lib/customers/actions";

export function RoleToggle({ userId, role, isSelf, email }: { userId: string; role: "customer" | "admin"; isSelf: boolean; email: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  if (isSelf) return <span className="text-caption text-muted">You</span>;
  const next = role === "admin" ? "customer" : "admin";
  const label = role === "admin" ? "Remove admin" : "Make admin";

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {confirming ? (
        <>
          <span className="text-caption text-muted">{label} for {email}?</span>
          <button
            type="button"
            disabled={pending}
            className="min-h-9 rounded-md bg-charcoal px-3 text-small text-ivory disabled:opacity-50"
            onClick={() =>
              start(async () => {
                const r = await setRoleAction(userId, next);
                setConfirming(false);
                if (r.error) setError(r.error);
                else router.refresh();
              })
            }
          >
            Confirm
          </button>
          <button type="button" className="min-h-9 rounded-md px-3 text-small hover:bg-beige" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </>
      ) : (
        <button type="button" className="min-h-9 rounded-md px-3 text-small hover:bg-beige" onClick={() => setConfirming(true)} aria-label={`${label}: ${email}`}>
          {label}
        </button>
      )}
      {error && <span role="alert" className="w-full text-right text-caption text-danger">{error}</span>}
    </div>
  );
}
