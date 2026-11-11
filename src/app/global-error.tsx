"use client";

import "./globals.css";

/** Last-resort boundary for errors in the root layout itself. Must render its own <html>/<body>. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-6 px-gutter text-center">
        <h1 className="font-serif text-h2">Something went wrong</h1>
        <p className="text-muted">Please try again in a moment.</p>
        <button
          type="button"
          onClick={() => retry()}
          className="min-h-12 rounded-pill bg-charcoal px-7 text-small font-medium text-ivory"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
