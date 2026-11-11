import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { STATUS_STYLE } from "@/components/admin/order-status";
import { EmptyState, LoadingIndicator } from "@/components/ui/states";
import { requireAdmin } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { formatDate, formatPrice } from "@/lib/format";
import { listOrders, revenueSummary } from "@/lib/orders/admin-queries";
import { paymentConfig, paymentsReady } from "@/lib/payments/lemonsqueezy";

export const metadata = { title: "Orders" };


export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <>
      <AdminPageHeader title="Orders" description="Payments are confirmed only by Lemon Squeezy's signed webhook — never by the customer's browser." />
      <Suspense fallback={<LoadingIndicator label="Loading orders" />}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Orders({ searchParams }: { searchParams: PageProps<"/admin/orders">["searchParams"] }) {
  await connection();
  await requireAdmin();
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "all";
  const mode = sp.mode === "test" || sp.mode === "all" ? sp.mode : "live";
  const [orders, revenue] = await Promise.all([listOrders({ status, mode }), revenueSummary()]);
  const cfg = paymentConfig();
  const r = mode === "test" ? revenue.test : revenue.live;

  return (
    <div className="flex flex-col gap-8">
      {!paymentsReady() && (
        <p role="alert" className="rounded-md bg-gold/20 px-4 py-3 text-small">
          Payments aren&apos;t fully configured yet (missing a Lemon Squeezy setting). Customers see &ldquo;Payments are being set up&rdquo; at checkout.
        </p>
      )}
      {cfg.testMode && (
        <p className="rounded-md bg-beige px-4 py-3 text-small">
          <strong>Test mode</strong> is on — checkouts use Lemon Squeezy test payments (no real money). Switch to live when your store is activated.
        </p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: `Revenue ${mode === "test" ? "(test)" : ""}`, value: formatPrice(r.grossCents), note: "Paid orders incl. tax, excl. refunds" },
          { label: "Last 30 days", value: formatPrice(r.last30Cents), note: "Paid in the past 30 days" },
          { label: "Paid orders", value: String(r.orders), note: `${r.refunded} refunded` },
          { label: "Before tax", value: formatPrice(r.netOfTaxCents), note: "Book prices only" },
        ].map((s) => (
          <li key={s.label} className="glass flex flex-col gap-1 rounded-lg p-5">
            <span className="text-small text-muted">{s.label}</span>
            <span className="font-serif text-h2 tabular-nums">{s.value}</span>
            <span className="text-caption text-muted">{s.note}</span>
          </li>
        ))}
      </ul>

      <form className="flex flex-wrap items-end gap-3" role="search" aria-label="Filter orders">
        <label className="flex flex-col gap-1.5 text-small font-medium">
          Status
          <select name="status" defaultValue={status} className="min-h-11 rounded-md border border-line bg-white px-3">
            {["all", "paid", "pending", "refunded", "partially_refunded", "failed"].map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-small font-medium">
          Payments
          <select name="mode" defaultValue={mode} className="min-h-11 rounded-md border border-line bg-white px-3">
            <option value="live">Live</option>
            <option value="test">Test</option>
            <option value="all">All</option>
          </select>
        </label>
        <button className="min-h-11 rounded-pill bg-charcoal px-6 text-small text-ivory">Apply</button>
      </form>

      {!orders.length ? (
        <EmptyState title="No orders yet" description={mode === "live" ? "Live orders appear here once real payments start. Switch to Test to see test purchases." : "No orders match these filters."} />
      ) : (
        <div className="glass overflow-x-auto rounded-lg">
          <table className="w-full min-w-[52rem] text-left text-small">
            <caption className="sr-only">Orders</caption>
            <thead className="border-b border-line text-caption uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Date</th>
                <th scope="col" className="px-4 py-3 font-medium">Customer</th>
                <th scope="col" className="px-4 py-3 font-medium">Books</th>
                <th scope="col" className="px-4 py-3 font-medium">Total</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Details</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 text-muted">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-3">{o.email}</td>
                  <td className="px-4 py-3">{o.order_items.map((i) => i.title).join(", ")}</td>
                  <td className="px-4 py-3 tabular-nums">{formatPrice(o.total_cents ?? o.subtotal_cents)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-pill px-2.5 py-1 text-caption font-medium", STATUS_STYLE[o.status])}>{o.status.replace("_", " ")}</span>
                    {o.test_mode && <span className="ml-2 rounded-pill bg-beige px-2 py-0.5 text-[0.6875rem] text-muted">test</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/orders/${o.id}`} className="text-gold-deep underline underline-offset-4" aria-label={`Order details for ${o.email}`}>
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
