"use client";

import { useEffect, useState } from "react";
import type { QualityTier } from "./scene-config";

export type SceneEnvironment = {
  /** "pending" during SSR/first paint; then 3D or the static fallback. */
  mode: "pending" | "3d" | "static";
  reason?: "reduced-motion" | "no-webgl" | "save-data";
  tier: QualityTier;
  layout: "wide" | "portrait";
};

const WIDE_QUERY = "(min-width: 1024px)";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

function detect(): SceneEnvironment {
  const wide = window.matchMedia(WIDE_QUERY).matches;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
  const tier: QualityTier = wide && !weak ? "high" : "low";
  const layout = wide ? "wide" : "portrait";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return { mode: "static", reason: "reduced-motion", tier, layout };
  if (nav.connection?.saveData) return { mode: "static", reason: "save-data", tier, layout };
  if (!hasWebGL()) return { mode: "static", reason: "no-webgl", tier, layout };
  return { mode: "3d", tier, layout };
}

/**
 * Decides, on the client only, whether to render the 3D library and at what quality.
 * Re-evaluates when the viewport crosses the wide breakpoint or motion preference changes.
 */
export function useSceneEnvironment(): [SceneEnvironment, () => void] {
  const [env, setEnv] = useState<SceneEnvironment>({ mode: "pending", tier: "low", layout: "portrait" });
  const [forcedStatic, setForcedStatic] = useState(false);

  useEffect(() => {
    const queries = [window.matchMedia(WIDE_QUERY), window.matchMedia("(prefers-reduced-motion: reduce)")];
    const update = () => setEnv(detect());
    // Deferred to a frame so the static page paints first and 3D never blocks first render.
    const raf = requestAnimationFrame(update);
    queries.forEach((q) => q.addEventListener("change", update));
    return () => {
      cancelAnimationFrame(raf);
      queries.forEach((q) => q.removeEventListener("change", update));
    };
  }, []);

  return [forcedStatic ? { ...env, mode: "static" } : env, () => setForcedStatic(true)];
}
