import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { RefundButton } from "@/components/admin/refund-button";
import { LoadingIndicator } from "@/components/ui/states";
import { requireAdmin } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import { getAdminOrder } from "@/lib/orders/admin-queries";
import { STATUS_STYLE } from "@/components/admin/order-status";

export const metadata = { title: "Order" };

const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC" : "—");

export default function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<LoadingIndicator label="Loading order" />}>
      <Order params={params} />
    </Suspense>
  );
}

async function Order({ params }: { params: PageProps<"/admin/orders/[id]">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const result = await getAdminOrder(id);
  if (!result) notFound();
  const { order: o, events } = result;

  return (
    <>
      <AdminPageHeader
        title={`Order ${o.provider_order_number ? `#${o.provider_order_number}` : o.id.slice(0, 8)}`}
        description={o.email}
        actions={<Link href="/admin/orders" className="text-small text-muted hover:text-charcoal">← All orders</Link>}
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="flex flex-col gap-6">
          <div className="glass rounded-lg p-6">
            <h2 className="mb-4 font-serif text-h4">Books</h2>
            <ul className="flex flex-col divide-y divide-line">
              {o.order_items.map((i, n) => (
                <li key={n} className="flex justify-between py-2 text-small">
                  <span>{i.title}</span>
                  <span className="tabular-nums">{formatPrice(i.price_cents)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 flex flex-col gap-1 border-t border-line pt-4 text-small">
              <div className="flex justify-between"><dt className="text-muted">Subtotal (our price)</dt><dd className="tabular-nums">{formatPrice(o.subtotal_cents)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Tax (collected by Lemon Squeezy)</dt><dd className="tabular-nums">{o.tax_cents === null ? "—" : formatPrice(o.tax_cents)}</dd></div>
              <div className="flex justify-between font-medium"><dt>Total charged</dt><dd className="tabular-nums">{o.total_cents === null ? "—" : formatPrice(o.total_cents)}</dd></div>
            </dl>
          </div>

          <div className="glass rounded-lg p-6">
            <h2 className="mb-4 font-serif text-h4">Payment events</h2>
            {!events.length ? (
              <p className="text-small text-muted">No webhook received yet{o.status === "pending" ? " — the customer may not have completed payment." : "."}</p>
            ) : (
              <ol className="flex flex-col gap-2 text-small">
                {events.map((e, n) => (
                  <li key={n} className="flex flex-wrap justify-between gap-2 border-b border-line pb-2">
                    <span><code className="rounded bg-beige px-1.5">{e.event_name}</code> → {e.outcome ?? "processing"}</span>
                    <span className="text-caption text-muted">{dt(e.received_at)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <aside className="glass flex flex-col gap-4 rounded-lg p-6 lg:self-start">
          <p>
            <span className={cn("rounded-pill px-2.5 py-1 text-caption font-medium", STATUS_STYLE[o.status])}>{o.status.replace("_", " ")}</span>
            {o.test_mode && <span className="ml-2 rounded-pill bg-beige px-2 py-0.5 text-caption text-muted">test payment</span>}
          </p>
          <dl className="flex flex-col gap-2 text-small">
            <div><dt className="text-muted">Created</dt><dd>{dt(o.created_at)}</dd></div>
            <div><dt className="text-muted">Paid</dt><dd>{dt(o.paid_at)}</dd></div>
            {o.refunded_at && <div><dt className="text-muted">Refunded</dt><dd>{dt(o.refunded_at)}</dd></div>}
            <div><dt className="text-muted">Lemon Squeezy order</dt><dd className="break-all">{o.provider_order_id ?? "—"}</dd></div>
            <div><dt className="text-muted">Our reference</dt><dd className="break-all">{o.id}</dd></div>
          </dl>
          {o.receipt_url && (
            <a href={o.receipt_url} target="_blank" rel="noopener noreferrer" className="text-small text-gold-deep underline underline-offset-4">
              View receipt ↗
            </a>
          )}
          {(o.status === "paid" || o.status === "partially_refunded") && o.provider_order_id && !o.provider_order_id.startsWith("free-") && (
            <RefundButton orderId={o.id} amount={formatPrice(o.total_cents ?? o.subtotal_cents)} />
          )}
        </aside>
      </div>
    </>
  );
}
