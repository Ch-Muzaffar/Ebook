"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { THEME_KEY } from "./theme-script";

/**
 * Two themes: "light" = Classic Library, "dark" = Modern Luxury. The visitor's explicit choice is
 * stored in their browser; without one, the OS setting is followed. The <html data-theme>
 * attribute is set before first paint by THEME_SCRIPT (no flash of the wrong theme).
 */
export type Theme = "light" | "dark";
const KEY = THEME_KEY;

function current(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  // Follow OS changes while the visitor hasn't chosen explicitly.
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const onOs = () => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {}
    if (!stored) document.documentElement.dataset.theme = mq.matches ? "dark" : "light";
  };
  mq.addEventListener("change", onOs);
  return () => {
    mo.disconnect();
    mq.removeEventListener("change", onOs);
  };
}

/** Current theme; "light" during server render. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, current, () => "light");
}

export function setTheme(theme: Theme) {
  const root = document.documentElement;
  try {
    localStorage.setItem(KEY, theme);
  } catch {}
  const apply = () => {
    root.dataset.theme = theme;
  };
  // One GPU cross-fade of the page snapshot (View Transitions API) — cheap and smooth. Browsers
  // without it, and visitors who prefer reduced motion, get an instant switch.
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(apply);
  else apply();
}

/** Sun/moon switch. Labelled for screen readers with the theme it switches TO. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={next === "dark" ? "Switch to dark theme (Modern Luxury)" : "Switch to light theme (Classic Library)"}
      title={next === "dark" ? "Modern Luxury (dark)" : "Classic Library (light)"}
      data-testid="theme-toggle"
      className={cn(
        "group relative inline-flex size-11 items-center justify-center rounded-pill text-charcoal transition-colors hover:bg-charcoal/8",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-5 overflow-visible" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        {/* Sun rays fade out and the disc becomes a crescent in dark mode. */}
        <g className="origin-center transition-[opacity,transform] duration-(--duration-slow) ease-editorial [[data-theme=dark]_&]:scale-50 [[data-theme=dark]_&]:opacity-0">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="12" y1="2.5" x2="12" y2="4.5" transform={`rotate(${a} 12 12)`} strokeLinecap="round" />
          ))}
        </g>
        <mask id="moon-cut">
          <rect x="-2" y="-2" width="28" height="28" fill="white" />
          <circle
            r="5"
            fill="black"
            className="transition-[cx,cy] duration-(--duration-slow) ease-editorial [cx:24px] [cy:0px] [[data-theme=dark]_&]:[cx:16px] [[data-theme=dark]_&]:[cy:8px]"
          />
        </mask>
        <circle
          cx="12"
          cy="12"
          mask="url(#moon-cut)"
          className="fill-current transition-[r] duration-(--duration-slow) ease-editorial [r:4.5px] [[data-theme=dark]_&]:[r:7.5px]"
        />
      </svg>
    </button>
  );
}
