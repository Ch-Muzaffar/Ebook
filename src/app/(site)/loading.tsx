import { LoadingIndicator } from "@/components/ui/states";

/**
 * Shown while a page streams in (e.g. the first request after content is edited).
 * Fills the viewport so the footer stays below the fold — otherwise it flashes mid-screen
 * and then jumps away, a large layout shift (measured CLS 0.42 before this fix).
 */
export default function Loading() {
  return <LoadingIndicator className="min-h-[calc(100svh-var(--spacing-header))] justify-center" />;
}
