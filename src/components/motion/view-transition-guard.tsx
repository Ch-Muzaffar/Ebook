"use client";

import { useEffect } from "react";

/**
 * If the next page takes longer than the browser's view-transition limit (~4s on a slow
 * connection), the browser abandons the animation and rejects a promise React doesn't await.
 * Navigation still completes normally, so this is expected — don't report it as an error.
 *
 * (Scrolling is native on purpose: inertial "smooth scroll" libraries make any slow frame feel
 * like lag, and native scrolling is always the most responsive.)
 */
export function ViewTransitionGuard() {
  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason as { name?: string; message?: string } | undefined;
      if (r?.name === "TimeoutError" && r.message?.includes("Transition was aborted")) e.preventDefault();
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);
  return null;
}
