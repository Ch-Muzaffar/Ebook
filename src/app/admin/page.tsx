import Link from "next/link";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { LinkButton } from "@/components/ui/button";
import { LoadingIndicator } from "@/components/ui/states";
import { getAllArticlesForAdmin } from "@/lib/blog/queries";
import { getAllProductsForAdmin } from "@/lib/catalog/queries";
import { sessionDb } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import { revenueSummary } from "@/lib/orders/admin-queries";

export const metadata = { title: "Overview" };

export default function AdminOverviewPage() {
  return (
    <>
      <AdminPageHeader
        title="Overview"
        description="Store status at a glance."
        actions={<LinkButton href="/admin/products/new" size="sm">New book</LinkButton>}
      />
      <Suspense fallback={<LoadingIndicator label="Loading overview" />}>
        <Stats />
      </Suspense>
    </>
  );
}

async function Stats() {
  const db = await sessionDb();
  const [products, articles, customers, subscribers, revenue] = await Promise.all([
    getAllProductsForAdmin(),
    getAllArticlesForAdmin(),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    db.from("subscribers").select("id", { count: "exact", head: true }).is("unsubscribed_at", null),
    revenueSummary(),
  ]);
  const published = products.filter((p) => p.status === "published");
  const liveArticles = articles.filter((a) => a.live).length;
  const scheduled = articles.filter((a) => a.status === "scheduled" && !a.live).length;
  // PRD §10.1: revenue only from verified (webhook-confirmed) payments; live and test kept apart.
  const stats = [
    { label: "Revenue (live payments)", value: formatPrice(revenue.live.grossCents), href: "/admin/orders" },
    { label: "Paid orders (live)", value: revenue.live.orders, href: "/admin/orders" },
    { label: "Books published", value: published.length, href: "/admin/products" },
    { label: "Book drafts", value: products.length - published.length, href: "/admin/products" },
    { label: "Articles live", value: liveArticles, href: "/admin/articles" },
    { label: "Articles scheduled / draft", value: `${scheduled} / ${articles.filter((a) => a.status === "draft").length}`, href: "/admin/articles" },
    { label: "Customers", value: customers.count ?? 0, href: "/admin/customers" },
    { label: "Newsletter subscribers", value: subscribers.count ?? 0, href: "/admin/subscribers" },
  ];
  const testNote =
    revenue.test.orders > 0 ? `${revenue.test.orders} test-mode order(s) (${formatPrice(revenue.test.grossCents)}) are excluded from revenue.` : null;

  return (
    <div className="flex flex-col gap-10">
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="glass flex flex-col gap-1 rounded-lg p-5 hover:ring-muted">
              <span className="text-small text-muted">{s.label}</span>
              <span className="font-serif text-h2 tabular-nums">{s.value}</span>
            </Link>
          </li>
        ))}
      </ul>
      <section aria-labelledby="notes-heading">
        <h2 id="notes-heading" className="sr-only">Notes</h2>
        {testNote && <p className="text-caption text-muted">{testNote}</p>}
        <p className="text-caption text-muted">Revenue counts only payments confirmed by Lemon Squeezy&apos;s signed webhook, minus full refunds.</p>
      </section>
    </div>
  );
}
