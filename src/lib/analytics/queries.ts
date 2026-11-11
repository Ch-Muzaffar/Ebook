import "server-only";

import { sessionDb } from "@/lib/supabase/server";

export type Range = "30" | "90" | "365";
export type Mode = "live" | "test";
export type Point = { key: string; label: string; value: number };

const DAY = 24 * 60 * 60 * 1000;

/** Day buckets for 30 days, weekly (Monday-start, UTC) for 90 days, monthly for 12 months. */
function buckets(range: Range, now: number) {
  const start = now - Number(range) * DAY;
  const keyOf = (t: number) => {
    const d = new Date(t);
    if (range === "30") return d.toISOString().slice(0, 10);
    if (range === "365") return d.toISOString().slice(0, 7);
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
    return monday.toISOString().slice(0, 10);
  };
  const labelOf = (key: string) => {
    const d = new Date(range === "365" ? `${key}-01T00:00:00Z` : `${key}T00:00:00Z`);
    return range === "365"
      ? d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" })
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  };
  const keys: string[] = [];
  const step = range === "30" ? DAY : range === "90" ? 7 * DAY : 28 * DAY;
  for (let t = start; t <= now; t += step) if (!keys.includes(keyOf(t))) keys.push(keyOf(t));
  if (!keys.includes(keyOf(now))) keys.push(keyOf(now));
  const series = (dates: (string | null)[], weight?: number[]): Point[] => {
    const m = new Map(keys.map((k) => [k, 0]));
    dates.forEach((iso, i) => {
      if (!iso) return;
      const t = Date.parse(iso);
      if (t < start) return;
      const k = keyOf(t);
      if (m.has(k)) m.set(k, m.get(k)! + (weight ? weight[i] : 1));
    });
    return keys.map((k) => ({ key: k, label: labelOf(k), value: m.get(k)! }));
  };
  return { start, series };
}

/**
 * Store analytics from first-party data only (PRD §10.1): revenue counts webhook-verified payments,
 * excluding fully refunded orders; live and test-mode payments are never mixed.
 */
export async function getStoreAnalytics(range: Range, mode: Mode) {
  const db = await sessionDb(); // request-time: calls connection()
  const now = Date.now();
  const { start, series } = buckets(range, now);
  const since = new Date(start).toISOString();

  const [orders, customers, subs, unsubs] = await Promise.all([
    db
      .from("orders")
      .select("paid_at, total_cents, status, order_items(product_id, title, price_cents)")
      .in("status", ["paid", "partially_refunded"])
      .eq("test_mode", mode === "test")
      .gte("paid_at", since)
      .order("paid_at")
      .limit(5000),
    db.from("profiles").select("created_at").eq("role", "customer").gte("created_at", since).limit(5000),
    db.from("subscribers").select("created_at").gte("created_at", since).limit(5000),
    db.from("subscribers").select("id", { count: "exact", head: true }).gte("unsubscribed_at", since),
  ]);
  for (const r of [orders, customers, subs]) if (r.error) throw new Error(r.error.message);

  const paid = orders.data ?? [];
  const revenueCents = paid.reduce((s, o) => s + (o.total_cents ?? 0), 0);

  const byBook = new Map<string, { title: string; units: number; cents: number }>();
  for (const o of paid)
    for (const it of o.order_items ?? []) {
      const k = it.product_id ?? `deleted:${it.title}`;
      const row = byBook.get(k) ?? { title: it.title, units: 0, cents: 0 };
      row.units += 1;
      row.cents += it.price_cents;
      byBook.set(k, row);
    }

  return {
    totals: {
      revenueCents,
      orders: paid.length,
      avgOrderCents: paid.length ? Math.round(revenueCents / paid.length) : 0,
      newCustomers: customers.data?.length ?? 0,
      newSubscribers: subs.data?.length ?? 0,
      unsubscribed: unsubs.count ?? 0,
    },
    revenue: series(paid.map((o) => o.paid_at), paid.map((o) => o.total_cents ?? 0)),
    orders: series(paid.map((o) => o.paid_at)),
    customers: series((customers.data ?? []).map((c) => c.created_at)),
    subscribers: series((subs.data ?? []).map((s) => s.created_at)),
    books: [...byBook.values()].sort((a, b) => b.cents - a.cents || b.units - a.units),
  };
}
