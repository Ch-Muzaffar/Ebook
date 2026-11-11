import type { Point } from "@/lib/analytics/queries";

/**
 * Small dependency-free charts for the admin (server-rendered HTML).
 * Single series → one hue (gold-deep), no legend; the title names the measure.
 * Thin columns with 4px rounded tops on a baseline, 2px gaps, recessive gridlines,
 * a hover/focus tooltip on every mark, and a table view for accessibility.
 */

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

export function ColumnChart({
  title,
  points,
  format = (n) => String(n),
  summary,
}: {
  title: string;
  points: Point[];
  format?: (n: number) => string;
  summary?: string;
}) {
  const max = niceMax(Math.max(...points.map((p) => p.value), 0));
  const tickIdx = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]);
  return (
    <figure className="glass flex flex-col gap-4 rounded-lg p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-small font-medium">{title}</span>
        {summary && <span className="font-serif text-h4 tabular-nums">{summary}</span>}
      </figcaption>

      <div className="grid grid-cols-[auto_1fr] gap-x-3" aria-hidden>
        <div className="flex h-40 flex-col justify-between text-right text-caption text-muted tabular-nums">
          <span className="-translate-y-1/2">{format(max)}</span>
          <span className="-translate-y-1/2">{format(max / 2)}</span>
          <span className="translate-y-1/2">{format(0)}</span>
        </div>
        <div className="relative h-40 border-b border-muted/40">
          <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-line" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-line" />
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {points.map((p) => (
              <div key={p.key} tabIndex={0} className="group relative flex h-full min-w-0 flex-1 items-end outline-none">
                <div
                  className="w-full rounded-t-[4px] bg-gold-deep transition-opacity group-hover:opacity-80 group-focus:opacity-80"
                  style={{ height: p.value ? `max(2px, ${(p.value / max) * 100}%)` : 0 }}
                />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-charcoal px-2 py-1 text-caption text-ivory group-hover:block group-focus:block">
                  {p.label}: <strong className="font-semibold">{format(p.value)}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
        <span />
        <div className="mt-2 flex text-caption text-muted">
          {points.map((p, i) => (
            <span key={p.key} className="min-w-0 flex-1 text-center whitespace-nowrap">
              {tickIdx.has(i) ? p.label : ""}
            </span>
          ))}
        </div>
      </div>

      <details className="text-small">
        <summary className="cursor-pointer text-caption text-muted hover:text-charcoal">Show as table</summary>
        <table className="mt-3 w-full text-left">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="text-caption text-muted">
              <th className="py-1 font-medium">Period</th>
              <th className="py-1 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.key} className="border-t border-line">
                <td className="py-1">{p.label}</td>
                <td className="py-1 text-right tabular-nums">{format(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Ranked horizontal bars (magnitude by item) with direct value labels — a table that reads as a chart. */
export function BarList({ title, rows }: { title: string; rows: { label: string; value: number; display: string; detail?: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <figure className="glass flex flex-col gap-4 rounded-lg p-5">
      <figcaption className="text-small font-medium">{title}</figcaption>
      <table className="w-full text-small">
        <caption className="sr-only">{title}</caption>
        <thead className="sr-only">
          <tr>
            <th>Book</th>
            <th>Revenue</th>
            <th>Copies</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row" className="w-full py-2 pr-4 text-left font-normal">
                <span className="block truncate">{r.label}</span>
                <span aria-hidden className="mt-1 block h-2 rounded-r-[4px] bg-gold-deep" style={{ width: `${Math.max(1, (r.value / max) * 100)}%` }} />
              </th>
              <td className="py-2 text-right whitespace-nowrap tabular-nums">{r.display}</td>
              <td className="py-2 pl-4 text-right whitespace-nowrap text-muted tabular-nums">{r.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
