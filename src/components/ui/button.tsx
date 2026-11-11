import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-sans font-medium tracking-wide " +
  "transition-colors duration-(--duration-base) ease-standard select-none " +
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

// Primary buttons get a soft light sweep on hover (a "glint" across polished lacquer).
const glint =
  "relative isolate overflow-hidden before:absolute before:inset-0 before:-z-10 before:-translate-x-full " +
  "before:bg-[linear-gradient(110deg,transparent_25%,color-mix(in_oklab,var(--color-gold)_45%,transparent)_50%,transparent_75%)] " +
  "before:transition-transform before:duration-700 before:ease-editorial hover:before:translate-x-full";

const variants: Record<Variant, string> = {
  primary: `bg-charcoal text-ivory hover:bg-charcoal-soft ${glint}`,
  secondary: "border border-charcoal text-charcoal hover:bg-charcoal hover:text-ivory",
  ghost: "text-charcoal underline-offset-4 hover:underline",
};

// min-h-11 = 44px touch target on every size.
const sizes: Record<Size, string> = {
  sm: "min-h-11 px-5 text-small",
  md: "min-h-12 px-7 text-small",
  lg: "min-h-14 px-9 text-body",
};

type StyleProps = { variant?: Variant; size?: Size };

export function buttonClasses({ variant = "primary", size = "md" }: StyleProps = {}, extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & StyleProps) {
  return <button type={type} className={buttonClasses({ variant, size }, className)} {...props} />;
}

export function LinkButton({ variant, size, className, ...props }: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={buttonClasses({ variant, size }, className)} {...props} />;
}
