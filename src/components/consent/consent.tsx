"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

/**
 * Cookie consent (PRD §10/§11). The visitor's choice is stored only in their browser.
 * Analytics (Google Tag Manager) and advertising scripts load ONLY after "Accept";
 * essential cookies (sign-in session, shopping bag) need no consent.
 */
export type Consent = "granted" | "denied" | "unset" | "unknown";

const KEY = "dt-consent-v1";
const EVENT = "dt-consent-change";

function read(): Consent {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : "unset";
  } catch {
    return "unset"; // storage blocked → ask every visit, load nothing
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** "unknown" during server render / hydration, then the stored choice. */
export function useConsent(): Consent {
  return useSyncExternalStore(subscribe, read, () => "unknown");
}

export function setConsent(value: "granted" | "denied" | null) {
  const before = read();
  try {
    if (value) window.localStorage.setItem(KEY, value);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  // Google Consent Mode v2: tell Google tags (loaded with everything "denied") what was chosen.
  const state = value === "granted" ? "granted" : "denied";
  (window as Window & { gtag?: (...args: unknown[]) => void }).gtag?.("consent", "update", {
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
    analytics_storage: state,
  });
  // Scripts already loaded (e.g. ads) can't be unloaded — a reload guarantees a clean page after withdrawal.
  if (before === "granted" && value === "denied") {
    window.location.reload();
    return;
  }
  window.dispatchEvent(new Event(EVENT));
}

export function CookieBanner() {
  const consent = useConsent();
  if (consent !== "unset") return null;
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      data-testid="cookie-banner"
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
    >
      <div className="glass-strong mx-auto flex max-w-content flex-col gap-4 rounded-lg p-6 md:flex-row md:items-center md:gap-8">
        <div className="flex flex-1 flex-col gap-1">
          <p id="cookie-title" className="font-serif text-h4">
            Your privacy
          </p>
          <p className="text-small text-muted">
            We use essential cookies to keep you signed in and remember your bag. With your permission we&apos;d
            also use analytics and advertising cookies to understand visits and support the site. See our{" "}
            <Link href="/privacy#cookies" className="text-charcoal underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <Button variant="secondary" size="sm" onClick={() => setConsent("denied")}>
            Reject
          </Button>
          <Button size="sm" onClick={() => setConsent("granted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Footer link that re-opens the banner so visitors can change their choice at any time. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => setConsent(null)}>
      Cookie settings
    </button>
  );
}
