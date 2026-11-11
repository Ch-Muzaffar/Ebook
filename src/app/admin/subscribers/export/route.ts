import { getCurrentUser } from "@/lib/auth/session";
import { sessionDb } from "@/lib/supabase/server";

/** CSV export of ACTIVE subscribers (admins only — the proxy, this check and RLS all apply). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return new Response("Forbidden", { status: 403 });
  const db = await sessionDb();
  const { data, error } = await db.from("subscribers").select("email, source, created_at").is("unsubscribed_at", null).order("created_at");
  if (error) return new Response("Export failed", { status: 500 });
  // Neutralise spreadsheet formula injection (cells starting with = + - @).
  const cell = (v: string) => `"${String(v).replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"`;
  const csv = ["email,source,subscribed_at", ...data.map((r) => [r.email, r.source, r.created_at].map(cell).join(","))].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
