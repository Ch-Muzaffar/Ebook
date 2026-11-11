import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { RoleToggle } from "@/components/admin/role-toggle";
import { EmptyState, LoadingIndicator } from "@/components/ui/states";
import { requireAdmin } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { sessionDb } from "@/lib/supabase/server";

export const metadata = { title: "Customers" };

export default function AdminCustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  return (
    <>
      <AdminPageHeader title="Customers" description="Registered accounts. Their orders are listed under Orders." />
      <Suspense fallback={<LoadingIndicator label="Loading customers" />}>
        <Customers searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Customers({ searchParams }: { searchParams: PageProps<"/admin/customers">["searchParams"] }) {
  const me = await requireAdmin();
  const q = (await searchParams).q;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const db = await sessionDb();
  let request = db.from("profiles").select("id, email, full_name, role, created_at").order("created_at", { ascending: false }).limit(500);
  if (query) request = request.or(`email.ilike.%${query.replace(/[%,()]/g, "")}%,full_name.ilike.%${query.replace(/[%,()]/g, "")}%`);
  const { data: rows, error } = await request;
  if (error) throw new Error(error.message);
  const { count: total } = await db.from("profiles").select("id", { count: "exact", head: true });

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-wrap items-end gap-3" role="search">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-small font-medium">Search by name or email</span>
          <input name="q" defaultValue={query} className="min-h-11 rounded-md border border-line bg-white px-4" />
        </label>
        <button className="min-h-11 rounded-pill bg-charcoal px-6 text-small text-ivory">Search</button>
      </form>
      <p className="text-small text-muted">
        {query ? `${rows.length} matching` : `${total ?? rows.length} total`} account(s)
      </p>
      {!rows.length ? (
        <EmptyState title="No accounts found" />
      ) : (
        <div className="glass overflow-x-auto rounded-lg">
          <table className="w-full min-w-[44rem] text-left text-small">
            <caption className="sr-only">Customer accounts</caption>
            <thead className="border-b border-line text-caption uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Name</th>
                <th scope="col" className="px-4 py-3 font-medium">Email</th>
                <th scope="col" className="px-4 py-3 font-medium">Role</th>
                <th scope="col" className="px-4 py-3 font-medium">Joined</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.full_name || "—"}</td>
                  <td className="px-4 py-3 text-muted">{r.email}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-pill px-2.5 py-1 text-caption font-medium", r.role === "admin" ? "bg-gold/20 text-gold-deep" : "bg-beige text-muted")}>
                      {r.role === "admin" ? "Admin" : "Customer"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <RoleToggle userId={r.id} role={r.role} isSelf={r.id === me.id} email={r.email} />
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
