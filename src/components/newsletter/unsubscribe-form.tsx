"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { unsubscribeAction } from "@/lib/newsletter/actions";

export function UnsubscribeForm() {
  const token = useSearchParams().get("token") ?? "";
  const [state, action, pending] = useActionState(unsubscribeAction, undefined);
  if (state?.ok) return <p role="status" className="rounded-md bg-success/10 px-4 py-3 text-small text-success">{state.ok}</p>;
  return (
    <form action={action} className="flex flex-col items-start gap-4">
      <input type="hidden" name="token" value={token} />
      {state?.error && <p role="alert" className="rounded-md bg-danger/10 px-4 py-3 text-small text-danger">{state.error}</p>}
      <p className="text-muted">Click below to confirm you no longer want to receive our emails.</p>
      <Button type="submit" disabled={pending || !token}>
        {pending ? "Unsubscribing…" : "Unsubscribe"}
      </Button>
    </form>
  );
}
