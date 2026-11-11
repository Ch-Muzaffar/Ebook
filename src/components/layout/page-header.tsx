import type { ReactNode } from "react";
import { Container } from "./container";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";

/** Standard top-of-page title block used by interior pages. */
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-line">
      <Container className="flex flex-col gap-5 pt-16 pb-12 md:pt-24 md:pb-16">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Heading as="h1" size="h1" className="max-w-3xl">
          {title}
        </Heading>
        {description && (
          <Text size="lead" muted className="max-w-2xl">
            {description}
          </Text>
        )}
        {children}
      </Container>
    </div>
  );
}

/** Clearly labelled placeholder used while a page's real feature is in a later phase. */
export function PhasePlaceholder({ phase, children }: { phase: string; children: ReactNode }) {
  return (
    <Container className="py-section">
      <div className="mx-auto flex max-w-narrow flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-14 text-center">
        <span className="rounded-pill bg-beige px-3 py-1 text-eyebrow font-medium uppercase text-gold-deep">
          Placeholder · {phase}
        </span>
        <div className="text-small text-muted">{children}</div>
      </div>
    </Container>
  );
}
