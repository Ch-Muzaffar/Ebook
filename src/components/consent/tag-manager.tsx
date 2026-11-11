"use client";

import { useEffect } from "react";
import { useConsent } from "./consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/**
 * Google Tag Manager — injected only after the visitor accepts cookies. Mounted in the public
 * site layout only, so it never runs on /admin. GA4 is configured inside GTM (a "Google tag"),
 * whose enhanced measurement records client-side navigations as page views.
 */
/**
 * Mounted in the admin layout. Tag Manager can't be unloaded, so if the visitor arrived by a
 * client-side navigation from a public page where it was running, reload into a clean document.
 */
export function NoTracking() {
  useEffect(() => {
    if (document.querySelector("script[data-gtm]")) window.location.reload();
  }, []);
  return null;
}

export function TagManager({ id }: { id?: string }) {
  const consent = useConsent();
  useEffect(() => {
    if (!id || consent !== "granted") return;
    if (document.querySelector(`script[data-gtm="${id}"]`)) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
    s.dataset.gtm = id;
    document.head.appendChild(s);
  }, [id, consent]);
  return null;
}
