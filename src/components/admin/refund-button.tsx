"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { refundOrderAction } from "@/lib/orders/admin-actions";

export function RefundButton({ orderId, amount }: { orderId: string; amount: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2">
      {!confirm ? (
        <button type="button" onClick={() => setConfirm(true)} className="min-h-10 w-fit rounded-pill border border-danger px-5 text-small font-medium text-danger hover:bg-danger/10">
          Refund {amount}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm refund">
          <span className="text-small">Refund {amount} in full and remove download access?</span>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await refundOrderAction(orderId);
                setMsg(r);
                setConfirm(false);
                router.refresh();
              })
            }
            className="min-h-10 rounded-pill bg-danger px-5 text-small font-medium text-white disabled:opacity-50"
          >
            {pending ? "Requesting…" : "Confirm refund"}
          </button>
          <button type="button" onClick={() => setConfirm(false)} className="min-h-10 rounded-pill px-4 text-small hover:bg-beige">
            Cancel
          </button>
        </div>
      )}
      {msg.ok && <p role="status" className="text-caption text-success">{msg.ok}</p>}
      {msg.error && <p role="alert" className="text-caption text-danger">{msg.error}</p>}
    </div>
  );
}
