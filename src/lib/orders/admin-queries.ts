import "server-only";

import { sessionDb } from "@/lib/supabase/server";

export type AdminOrder = {
  id: string;
  email: string;
  status: string;
  currency: string;
  subtotal_cents: number;
  tax_cents: number | null;
  total_cents: number | null;
  provider_order_id: string | null;
  provider_order_number: number | null;
  receipt_url: string | null;
  test_mode: boolean;
  created_at: string;
  paid_at: string | null;
  refunded_at: string | null;
  order_items: { title: string; price_cents: number }[];
};

const COLS =
  "id, email, status, currency, subtotal_cents, tax_cents, total_cents, provider_order_id, provider_order_number, receipt_url, test_mode, created_at, paid_at, refunded_at, order_items(title, price_cents)";

/** Admin reads go through the session client — RLS lets only admins see all orders. */
export async function listOrders(filter: { status?: string; mode?: "live" | "test" | "all" } = {}): Promise<AdminOrder[]> {
  const db = await sessionDb();
  let q = db.from("orders").select(COLS).order("created_at", { ascending: false }).limit(500);
  if (filter.status && filter.status !== "all") q = q.eq("status", filter.status);
  if (filter.mode === "live") q = q.eq("test_mode", false);
  if (filter.mode === "test") q = q.eq("test_mode", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as AdminOrder[];
}

export async function getAdminOrder(id: string) {
  const db = await sessionDb();
  const [{ data: order }, { data: events }] = await Promise.all([
    db.from("orders").select(COLS).eq("id", id).maybeSingle(),
    db.from("payment_events").select("event_name, received_at, processed_at, outcome").eq("order_id", id).order("received_at"),
  ]);
  return order ? { order: order as AdminOrder, events: events ?? [] } : null;
}

/**
 * Revenue from VERIFIED payments only (PRD §10.1): paid orders (incl. partially refunded) minus
 * nothing else; refunded orders excluded. Test-mode and live payments are reported separately.
 */
export async function revenueSummary() {
  const db = await sessionDb();
  const { data, error } = await db.from("orders").select("status, total_cents, subtotal_cents, tax_cents, test_mode, paid_at").in("status", ["paid", "partially_refunded", "refunded"]);
  if (error) throw new Error(error.message);
  const sum = (live: boolean) => {
    const rows = data.filter((o) => o.test_mode === !live);
    const kept = rows.filter((o) => o.status !== "refunded");
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return {
      orders: kept.length,
      refunded: rows.length - kept.length,
      grossCents: kept.reduce((s, o) => s + (o.total_cents ?? 0), 0),
      netOfTaxCents: kept.reduce((s, o) => s + (o.subtotal_cents ?? 0), 0),
      last30Cents: kept.filter((o) => o.paid_at && Date.parse(o.paid_at) >= since).reduce((s, o) => s + (o.total_cents ?? 0), 0),
    };
  };
  return { live: sum(true), test: sum(false) };
}
