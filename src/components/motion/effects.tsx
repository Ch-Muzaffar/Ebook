"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const reduced = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Runs `cb` once when the element scrolls into view. The observer is created ONCE (the latest
 * callback is kept in a ref): re-creating it on every render made it fire again and again.
 */
function useInView<T extends Element>(cb: () => void, amount = 0.35) {
  const ref = useRef<T>(null);
  const cbRef = useRef(cb);
  useEffect(() => {
    cbRef.current = cb;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          cbRef.current();
        }
      },
      { threshold: amount },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [amount]);
  return ref;
}

/**
 * Headline that rises in word by word from behind a mask. Words stay real text (selectable,
 * read normally by screen readers). Without JavaScript or with reduced motion it simply shows.
 */
export function SplitText({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const [shown, setShown] = useState(false);
  const ref = useInView<HTMLSpanElement>(() => setShown(true), 0.2);
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span ref={ref} data-split="" data-shown={shown ? "" : undefined} className={className}>
      {words.map((w, i) => (
        // The space must sit OUTSIDE the inline-block mask, or the browser collapses it.
        <Fragment key={i}>
          <span className="split-word">
            <span style={{ transitionDelay: `${delay + i * 55}ms` }}>{w}</span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}

/** Gently pulls its child toward the pointer (desktop only) — for primary calls to action. */
export function Magnetic({ children, strength = 0.28, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || !matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`;
    };
    const onLeave = () => (el.style.transform = "");
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [strength]);
  return (
    <span ref={ref} className={cn("inline-block transition-transform duration-500 ease-editorial will-change-transform", className)}>
      {children}
    </span>
  );
}

/** Moves its content slower than the page as it scrolls past (depth). */
export function Parallax({ children, distance = 60, className }: { children: ReactNode; distance?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const raw = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [distance, -distance]);
  const y = useSpring(raw, { stiffness: 120, damping: 30, mass: 0.4 });
  return (
    <div ref={ref} className={cn("overflow-hidden", className)}>
      <motion.div style={{ y }} className="h-full w-full">
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Counts up to `value` once, when first scrolled into view. The real number is in the HTML from the
 * start (SEO / no-JS). If the number is already on screen when the page loads it simply stays put;
 * otherwise it is reset to 0 while still off-screen (so the reset is never seen) and counts up on
 * arrival. Updates the text directly each frame — no React re-render per frame.
 */
export function CountUp({ value, className, duration = 1400 }: { value: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || value === 0) return;
    const fmt = (n: number) => n.toLocaleString("en-US");
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) return; // already visible: show the final value, no animation
    el.textContent = fmt(0);
    let frame = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const step = (t: number) => {
          const p = Math.min((t - start) / duration, 1);
          el.textContent = fmt(Math.round(value * (1 - Math.pow(1 - p, 3))));
          if (p < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      el.textContent = fmt(value);
    };
  }, [value, duration]);
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {value.toLocaleString("en-US")}
    </span>
  );
}
