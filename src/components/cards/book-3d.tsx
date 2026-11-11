"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { CoverTone } from "@/lib/content/types";
import { cn } from "@/lib/cn";

const SPINE: Record<CoverTone, string> = {
  charcoal: "bg-ink",
  gold: "bg-brass",
  beige: "bg-parchment",
};

/**
 * A real-looking hardcover built with CSS 3D (no WebGL): the cover (children) on the front,
 * a spine, a block of page edges and a back board. On desktop it tilts toward the pointer with a
 * moving light glare; touch devices and reduced motion get a still, three-quarter pose.
 */
export function Book3D({
  children,
  tone = "charcoal",
  rest = -16,
  range = 14,
  className,
  interactive = true,
}: {
  children: ReactNode;
  tone?: CoverTone;
  /** Resting turn in degrees (negative shows the page edges on the right). */
  rest?: number;
  /** How far the book follows the pointer, in degrees. */
  range?: number;
  className?: string;
  /** Track the pointer over this element (cards) — else the whole window (hero book). */
  interactive?: boolean | "window";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !interactive) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(pointer: fine)").matches) return;
    const target: HTMLElement | Window = interactive === "window" ? window : (el.closest("[data-book-hover]") as HTMLElement) ?? el;
    let frame = 0;
    const set = (px: number, py: number, active: boolean) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--ry", `${rest + px * range}deg`);
        el.style.setProperty("--rx", `${-py * range * 0.45}deg`);
        el.style.setProperty("--gx", `${50 + px * 50}%`);
        el.style.setProperty("--gy", `${50 + py * 50}%`);
        el.dataset.active = active ? "true" : "false";
      });
    };
    const onMove = (e: Event) => {
      const p = e as PointerEvent;
      const r = interactive === "window" ? { left: 0, top: 0, width: innerWidth, height: innerHeight } : el.getBoundingClientRect();
      const px = Math.max(-1, Math.min(1, ((p.clientX - r.left) / r.width) * 2 - 1));
      const py = Math.max(-1, Math.min(1, ((p.clientY - r.top) / r.height) * 2 - 1));
      set(px, py, true);
    };
    const onLeave = () => set(0, 0, false);
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerleave", onLeave);
    };
  }, [interactive, rest, range]);

  return (
    <div
      ref={ref}
      className={cn("book3d relative [container-type:inline-size] [perspective:1400px]", className)}
      style={{ ["--ry" as string]: `${rest}deg`, ["--rx" as string]: "0deg" }}
    >
      {/* Soft contact shadow on the "table" */}
      <div
        aria-hidden
        className="absolute inset-x-[8%] -bottom-[5%] h-[8%] rounded-[50%] bg-ink/35 blur-[10px] transition-transform duration-700 ease-editorial [transform:translateX(calc(var(--ry)*-0.4cqw))_scaleX(0.92)]"
      />
      <div className="relative [transform-style:preserve-3d] transition-transform duration-700 ease-editorial [transform:rotateY(var(--ry))_rotateX(var(--rx))] [.book3d[data-active=true]_&]:duration-200">
        {/* Back board */}
        <div aria-hidden className={cn("absolute inset-0 rounded-sm [transform:translateZ(-7cqw)]", SPINE[tone])} />
        {/* Spine — on the left edge, folding back */}
        <div
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 w-[7cqw] origin-left [transform:rotateY(90deg)] after:absolute after:inset-0 after:bg-[linear-gradient(90deg,rgb(0_0_0/0.35),rgb(255_255_255/0.08)_40%,rgb(0_0_0/0.25))]",
            SPINE[tone],
          )}
        />
        {/* Page block — on the right edge, fine paper lines */}
        <div
          aria-hidden
          className="absolute inset-y-[1.2%] right-[0.8%] w-[6.6cqw] origin-right bg-[repeating-linear-gradient(90deg,#efe7d8_0_1px,#d9cfbd_1px_2px)] shadow-[inset_6px_0_10px_-6px_rgb(0_0_0/0.35)] [transform:rotateY(-90deg)]"
        />
        {/* Front cover */}
        <div className="relative [transform:translateZ(0.01px)]">
          {children}
          {/* Hinge crease near the spine */}
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-[3.5%] w-[2.5%] bg-[linear-gradient(90deg,rgb(0_0_0/0.18),rgb(255_255_255/0.12),transparent)]" />
          {/* Light glare that follows the pointer */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-sm bg-[radial-gradient(circle_at_var(--gx,30%)_var(--gy,20%),rgb(255_255_255/0.38),transparent_55%)] opacity-40 mix-blend-soft-light transition-opacity duration-500 [.book3d[data-active=true]_&]:opacity-100"
          />
        </div>
      </div>
    </div>
  );
}
