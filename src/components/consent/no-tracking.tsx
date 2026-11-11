"use client";

import { useEffect } from "react";

/**
 * Mounted in the admin layout. Tag Manager can't be unloaded, so if the visitor arrived by a
 * client-side navigation from a public page where it was running, reload into a clean document.
 */
export function NoTracking() {
  useEffect(() => {
    if (document.querySelector("script[data-gtm], script#gtm-init")) window.location.reload();
  }, []);
  return null;
}
