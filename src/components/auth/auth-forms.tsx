"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  loginAction,
  registerAction,
  requestPasswordResetAction,
  updatePasswordAction,
  type AuthState,
} from "@/lib/auth/actions";

function Message({ state }: { state: AuthState }) {
  if (state?.error)
    return (
      <p role="alert" className="rounded-md bg-danger/10 px-4 py-3 text-small text-danger">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p role="status" className="rounded-md bg-success/10 px-4 py-3 text-small text-success">
        {state.ok}
      </p>
    );
  return null;
}

const shell = "mx-auto flex w-full max-w-md flex-col gap-6 py-section";

export function LoginForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <div className={shell}>
      {params.get("registered") && <p role="status" className="rounded-md bg-success/10 px-4 py-3 text-small text-success">Account created — please sign in.</p>}
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="next" value={params.get("next") ?? ""} />
        <Message state={state} />
        <Input label="Email address" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} />
        <Input label="Password" name="password" type="password" autoComplete="current-password" required />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
        <Link href="/forgot-password" className="text-small text-muted underline-offset-4 hover:text-charcoal hover:underline">
          Forgot your password?
        </Link>
      </form>
      <p className="text-small text-muted">
        New here?{" "}
        <Link href={`/register${params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`} className="text-gold-deep underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export function RegisterForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState(registerAction, undefined);
  return (
    <div className={shell}>
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="next" value={params.get("next") ?? ""} />
        {/* Honeypot: invisible to people, often filled in by bots. */}
        <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
          <label>
            Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <Message state={state} />
        <Input label="Full name" name="name" autoComplete="name" required maxLength={120} defaultValue={state?.values?.name} />
        <Input label="Email address" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} />
        <Input label="Password" name="password" type="password" autoComplete="new-password" required hint="At least 8 characters, including a letter and a number." />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-caption text-muted">
          By creating an account you agree to our <Link href="/terms" className="underline">Terms</Link> and{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </form>
      <p className="text-small text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-gold-deep underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export function ForgotPasswordForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState(requestPasswordResetAction, undefined);
  return (
    <div className={shell}>
      {params.get("expired") && <p role="alert" className="rounded-md bg-danger/10 px-4 py-3 text-small text-danger">That link has expired or was already used. Request a new one below.</p>}
      <form action={action} className="flex flex-col gap-5">
        <Message state={state} />
        <Input label="Email address" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <Link href="/login" className="text-small text-muted hover:text-charcoal">
        ← Back to sign in
      </Link>
    </div>
  );
}

export function SetPasswordForm({ title = "Set a new password" }: { title?: string }) {
  const [state, action, pending] = useActionState(updatePasswordAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-5" aria-label={title}>
      <Message state={state} />
      <Input label="New password" name="password" type="password" autoComplete="new-password" required hint="At least 8 characters, including a letter and a number." />
      <Input label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
