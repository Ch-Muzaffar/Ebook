"use client";

import { useActionState, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeAction } from "@/lib/newsletter/actions";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Newsletter sign-up: instant validation in the browser, real validation + saving on the server. */
export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeAction, undefined);
  const [clientError, setClientError] = useState("");
  const error = clientError || state?.error;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!email) setClientError("Please enter your email address.");
    else if (!EMAIL_PATTERN.test(email)) setClientError("Please enter a valid email address.");
    else return setClientError("");
    event.preventDefault();
  }

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex w-full flex-col gap-3">
      {/* Honeypot: hidden from people, often filled in by bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Company <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          label="Email address"
          hideLabel
          placeholder="you@example.com"
          error={error}
          onChange={() => clientError && setClientError("")}
        />
        <Button type="submit" className="shrink-0" disabled={pending}>
          {pending ? "Subscribing…" : "Subscribe"}
        </Button>
      </div>
      <p aria-live="polite" className="min-h-5 text-caption text-success">
        {!error && state?.ok ? state.ok : ""}
      </p>
      <p className="text-caption text-muted">We respect your inbox. Unsubscribe at any time.</p>
    </form>
  );
}
