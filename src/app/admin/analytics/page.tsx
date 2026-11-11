import Link from "next/link";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BarList, ColumnChart } from "@/components/admin/charts";
import { LoadingIndicator } from "@/components/ui/states";
import { getStoreAnalytics, type Mode, type Range } from "@/lib/analytics/queries";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Analytics" };

const RANGES: { value: Range; label: string }[] = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "12 months" },
];

export default function AdminAnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  return (
    <>
      <AdminPageHeader title="Analytics" description="Sales, customers and subscribers from your own store data." />
      <Suspense fallback={<LoadingIndicator label="Loading analytics" />}>
        <Analytics searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Analytics({ searchParams }: { searchParams: PageProps<"/admin/analytics">["searchParams"] }) {
  const sp = await searchParams;
  const range: Range = sp.range === "90" || sp.range === "365" ? sp.range : "30";
  const mode: Mode = sp.mode === "test" ? "test" : "live";
  const a = await getStoreAnalytics(range, mode);
  const money = (c: number) => formatPrice(Math.round(c));
  const href = (r: Range, m: Mode) => `/admin/analytics?range=${r}${m === "test" ? "&mode=test" : ""}`;
  const pill = (active: boolean) =>
    cn("flex min-h-9 items-center rounded-pill px-4 text-small", active ? "bg-charcoal text-ivory" : "glass hover:ring-muted");

  const tiles = [
    { label: "Revenue", value: money(a.totals.revenueCents) },
    { label: "Paid orders", value: a.totals.orders },
    { label: "Average order", value: money(a.totals.avgOrderCents) },
    { label: "New customers", value: a.totals.newCustomers },
    { label: "New subscribers", value: a.totals.newSubscribers, note: a.totals.unsubscribed ? `${a.totals.unsubscribed} unsubscribed` : undefined },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Filters: one row above the charts */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
        {RANGES.map((r) => (
          <Link key={r.value} href={href(r.value, mode)} aria-current={r.value === range ? "true" : undefined} className={pill(r.value === range)}>
            {r.label}
          </Link>
        ))}
        <span className="mx-2 h-6 w-px bg-line" aria-hidden />
        <Link href={href(range, "live")} aria-current={mode === "live" ? "true" : undefined} className={pill(mode === "live")}>
          Live payments
        </Link>
        <Link href={href(range, "test")} aria-current={mode === "test" ? "true" : undefined} className={pill(mode === "test")}>
          Test mode
        </Link>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {tiles.map((t) => (
          <li key={t.label} className="glass flex flex-col gap-1 rounded-lg p-5">
            <span className="text-small text-muted">{t.label}</span>
            <span className="font-serif text-h2 tabular-nums">{t.value}</span>
            {t.note && <span className="text-caption text-muted">{t.note}</span>}
          </li>
        ))}
      </ul>

      <div className="grid gap-6 xl:grid-cols-2">
        <ColumnChart title="Revenue" points={a.revenue} format={money} summary={money(a.totals.revenueCents)} />
        <ColumnChart title="Paid orders" points={a.orders} summary={String(a.totals.orders)} />
        <ColumnChart title="New customer accounts" points={a.customers} summary={String(a.totals.newCustomers)} />
        <ColumnChart title="New newsletter subscribers" points={a.subscribers} summary={String(a.totals.newSubscribers)} />
      </div>

      {a.books.length > 0 ? (
        <BarList
          title="Sales by book (pre-tax)"
          rows={a.books.map((b) => ({ label: b.title, value: b.cents, display: money(b.cents), detail: `${b.units} ${b.units === 1 ? "copy" : "copies"}` }))}
        />
      ) : (
        <p className="glass rounded-lg p-5 text-small text-muted">No {mode === "test" ? "test-mode" : "live"} sales in this period yet.</p>
      )}

      <section className="flex flex-col gap-2 rounded-lg bg-beige p-6 text-small text-muted">
        <h2 className="font-serif text-h4 text-charcoal">Website traffic</h2>
        <p>
          Visits, traffic sources and page views are measured by Google Analytics through Google Tag Manager (only for visitors who accept
          cookies). Open{" "}
          <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-charcoal underline underline-offset-4">
            Google Analytics
          </a>{" "}
          or{" "}
          <a href="https://tagmanager.google.com" target="_blank" rel="noopener noreferrer" className="text-charcoal underline underline-offset-4">
            Tag Manager
          </a>
          ; search performance is in{" "}
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-charcoal underline underline-offset-4">
            Search Console
          </a>
          .
        </p>
        <p className="text-caption">Revenue counts only payments confirmed by Lemon Squeezy&apos;s signed webhook; fully refunded orders are excluded. Dates are in UTC.</p>
      </section>
    </div>
  );
}
