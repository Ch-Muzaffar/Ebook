import type { ComponentProps, ElementType, ReactNode } from "react";
import { SplitText } from "@/components/motion/effects";
import { cn } from "@/lib/cn";

type HeadingSize = "display" | "h1" | "h2" | "h3" | "h4";

const headingSizes: Record<HeadingSize, string> = {
  display: "text-display",
  h1: "text-h1",
  h2: "text-h2",
  h3: "text-h3",
  h4: "text-h4",
};

/**
 * Semantic level (`as`) and visual size (`size`) are independent so the
 * document outline stays correct while the design stays consistent.
 */
export function Heading({
  as: Tag = "h2",
  size = "h2",
  className,
  id,
  reveal = false,
  children,
}: {
  as?: "h1" | "h2" | "h3" | "h4" | "p";
  size?: HeadingSize;
  className?: string;
  id?: string;
  /** Word-by-word rise when scrolled into view (plain-string headings only). */
  reveal?: boolean;
  children: ReactNode;
}) {
  return (
    <Tag id={id} className={cn("font-serif font-medium text-balance text-charcoal", headingSizes[size], className)}>
      {reveal && typeof children === "string" ? <SplitText text={children} /> : children}
    </Tag>
  );
}

type TextSize = "lead" | "body" | "small" | "caption";

export function Text({
  as: Tag = "p",
  size = "body",
  muted = false,
  className,
  ...props
}: ComponentProps<"p"> & { as?: ElementType; size?: TextSize; muted?: boolean }) {
  const sizeClass = { lead: "text-lead", body: "text-body", small: "text-small", caption: "text-caption" }[size];
  return <Tag className={cn(sizeClass, muted ? "text-muted" : "text-charcoal", "text-pretty", className)} {...props} />;
}

/** Small uppercase label above headings, led by a short gold-foil rule. */
export function Eyebrow({ className, children, ...props }: ComponentProps<"p">) {
  return (
    <p className={cn("inline-flex items-center gap-3 text-eyebrow font-medium uppercase text-gold-deep", className)} {...props}>
      <span aria-hidden className="bg-foil h-px w-7 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
