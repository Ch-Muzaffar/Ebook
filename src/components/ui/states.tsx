import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Heading, Text } from "./typography";

export function LoadingIndicator({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center gap-4 py-16", className)}>
      <span
        aria-hidden
        className="block size-8 animate-spin rounded-full border-2 border-line border-t-gold motion-reduce:animate-none"
      />
      <span className="text-small text-muted">{label}…</span>
    </div>
  );
}

function StatePanel({
  title,
  description,
  action,
  tone,
  role,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  tone: "neutral" | "error";
  role?: "alert";
}) {
  return (
    <div
      role={role}
      className={cn(
        "mx-auto flex max-w-narrow flex-col items-center gap-4 rounded-lg px-6 py-14 text-center",
        tone === "error" ? "border border-danger/25 bg-white" : "border border-dashed border-line",
      )}
    >
      <span aria-hidden className={cn("h-px w-10", tone === "error" ? "bg-danger" : "bg-gold")} />
      <Heading as="h2" size="h4">
        {title}
      </Heading>
      {description && (
        <Text size="small" muted>
          {description}
        </Text>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function EmptyState(props: { title: string; description?: string; action?: ReactNode }) {
  return <StatePanel tone="neutral" {...props} />;
}

export function ErrorState(props: { title?: string; description?: string; action?: ReactNode }) {
  return (
    <StatePanel
      tone="error"
      role="alert"
      title={props.title ?? "Something went wrong"}
      description={props.description ?? "Please try again. If the problem continues, contact us."}
      action={props.action}
    />
  );
}
