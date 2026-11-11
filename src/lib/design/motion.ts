/**
 * JS mirror of the motion tokens in src/app/globals.css (@theme --duration-* / --ease-*).
 * Use these in Framer Motion / React Three Fiber code (Phase 2) so CSS and JS animations
 * share one timing language. Keep the two in sync when changing either.
 */
export const duration = {
  fast: 0.15,
  base: 0.25,
  slow: 0.45,
  scene: 0.9,
} as const;

/** Cubic-bezier control points, usable as Framer Motion `ease` arrays. */
export const ease = {
  editorial: [0.22, 1, 0.36, 1],
  standard: [0.4, 0, 0.2, 1],
} as const;
