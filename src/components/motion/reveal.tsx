"use client";

import { motion, MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { duration, ease } from "@/lib/design/motion";

/**
 * Honour the OS "reduce motion" setting for every Framer Motion animation below it:
 * transforms are dropped, only opacity fades remain.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Fades + lifts its children into place once, when they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li";
}) {
  const Component = as === "li" ? motion.li : motion.div;
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: duration.slow * 1.6, delay, ease: ease.editorial }}
    >
      {children}
    </Component>
  );
}
