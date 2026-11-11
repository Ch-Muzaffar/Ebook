"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfileAction } from "@/lib/auth/actions";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-5">
      <Input label="Full name" name="name" defaultValue={name} maxLength={120} required />
      <Input label="Email address" value={email} readOnly disabled hint="Contact us to change your email address." />
      <div className="flex items-center gap-4">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {state?.ok && <p role="status" className="text-small text-success">{state.ok}</p>}
        {state?.error && <p role="alert" className="text-small text-danger">{state.error}</p>}
      </div>
    </form>
  );
}
