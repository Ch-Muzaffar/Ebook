import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Width = "prose" | "narrow" | "content" | "wide";

const widths: Record<Width, string> = {
  prose: "max-w-prose",
  narrow: "max-w-narrow",
  content: "max-w-content",
  wide: "max-w-wide",
};

export function Container({ width = "content", className, ...props }: ComponentProps<"div"> & { width?: Width }) {
  return <div className={cn("mx-auto w-full px-gutter", widths[width], className)} {...props} />;
}

type Tone = "ivory" | "beige" | "white";

// Translucent tones let the warm ambient light glow through (the glass look).
const tones: Record<Tone, string> = { ivory: "bg-transparent", beige: "bg-beige/55", white: "bg-white/50" };

/** Vertical rhythm wrapper for page sections. */
export function Section({
  tone = "ivory",
  width = "content",
  className,
  children,
  ...props
}: ComponentProps<"section"> & { tone?: Tone; width?: Width }) {
  return (
    <section className={cn("py-section", tones[tone], className)} {...props}>
      <Container width={width}>{children}</Container>
    </section>
  );
}
