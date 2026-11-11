import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Shared label / hint / error wiring for form controls (accessible descriptions). */
function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={id} className="text-small font-medium text-charcoal">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-caption text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const control = (error?: string) =>
  cn(
    "w-full rounded-md border bg-white px-4 text-body text-charcoal placeholder:text-muted/70",
    "transition-colors duration-(--duration-fast) ease-standard focus-visible:border-charcoal focus-visible:outline-offset-1",
    error ? "border-danger" : "border-line hover:border-muted",
  );

const describedBy = (id: string, hint?: string, error?: string) =>
  [hint && !error ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;

export function Textarea({ label, hint, error, id, className, ...props }: ComponentProps<"textarea"> & { label: string; hint?: string; error?: string }) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field id={fid} label={label} hint={hint} error={error}>
      <textarea
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        className={cn(control(error), "min-h-28 py-3 leading-relaxed", className)}
        {...props}
      />
    </Field>
  );
}

export function Select({
  label,
  hint,
  error,
  id,
  className,
  options,
  ...props
}: ComponentProps<"select"> & { label: string; hint?: string; error?: string; options: { value: string; label: string }[] }) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field id={fid} label={label} hint={hint} error={error}>
      <select
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        className={cn(control(error), "min-h-12 px-3", className)}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
