"use client";

import { useEffect, useRef } from "react";

/**
 * A soft gold ring that trails the pointer and swells over links and buttons. Purely decorative:
 * the system cursor stays visible, and it is skipped on touch screens and with reduced motion.
 */
export function CursorFollower() {
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ring.current;
    if (!el) return;
    if (!matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let x = -100;
    let y = -100;
    let cx = x;
    let cy = y;
    let scale = 1;
    let target = 1;
    let frame = 0;
    let visible = false;

    const tick = () => {
      cx += (x - cx) * 0.2;
      cy += (y - cy) * 0.2;
      scale += (target - scale) * 0.18;
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%) scale(${scale})`;
      frame = Math.abs(x - cx) + Math.abs(y - cy) + Math.abs(target - scale) > 0.1 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      if (!visible) {
        visible = true;
        cx = x;
        cy = y;
        el.style.opacity = "1";
      }
      const interactive = (e.target as Element | null)?.closest?.("a, button, [role=button], input, select, textarea, label, summary, canvas");
      target = interactive ? 1.9 : 1;
      el.dataset.active = interactive ? "true" : "false";
      kick();
    };
    const onLeave = () => {
      visible = false;
      el.style.opacity = "0";
    };
    const onDown = () => {
      target = 0.75;
      kick();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={ring}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[80] size-7 rounded-pill border border-gold opacity-0 transition-[opacity,background-color,border-color] duration-(--duration-base) data-[active=true]:border-gold/60 data-[active=true]:bg-gold/10"
    />
  );
}
