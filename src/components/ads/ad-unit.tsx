"use client";

import { useEffect, useRef } from "react";
import { useConsent } from "@/components/consent/consent";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * One AdSense unit. The AdSense script loads only after the visitor accepts cookies;
 * until then (or if rejected) the space stays empty. Reserved min-height avoids layout shift.
 */
export function AdUnit({ clientId, slot, format }: { clientId: string; slot: string; format: "auto" | "vertical" }) {
  const consent = useConsent();
  const pushed = useRef(false);

  useEffect(() => {
    if (consent !== "granted" || pushed.current) return;
    if (!document.querySelector(`script[data-adsense="${clientId}"]`)) {
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
      s.crossOrigin = "anonymous";
      s.dataset.adsense = clientId;
      document.head.appendChild(s);
    }
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      /* ad blockers etc. — leave the space empty */
    }
  }, [consent, clientId]);

  if (consent !== "granted") return <div className="min-h-[100px]" aria-hidden />;
  return (
    <ins
      className="adsbygoogle block min-h-[100px]"
      data-ad-client={clientId}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
