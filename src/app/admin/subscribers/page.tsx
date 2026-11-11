import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SubscriberDelete } from "@/components/admin/subscriber-delete";
import { EmptyState, LoadingIndicator } from "@/components/ui/states";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { sessionDb } from "@/lib/supabase/server";

export const metadata = { title: "Subscribers" };

export default function AdminSubscribersPage() {
  return (
    <>
      <AdminPageHeader
        title="Subscribers"
        description="Newsletter sign-ups. Sending newsletters arrives with email delivery (Resend) in Phase 6."
        actions={
          <a href="/admin/subscribers/export" className="inline-flex min-h-11 items-center rounded-pill border border-charcoal px-5 text-small font-medium hover:bg-charcoal hover:text-ivory">
            Export CSV
          </a>
        }
      />
      <Suspense fallback={<LoadingIndicator label="Loading subscribers" />}>
        <Subscribers />
      </Suspense>
    </>
  );
}

async function Subscribers() {
  await requireAdmin();
  const db = await sessionDb();
  const { data: rows, error } = await db.from("subscribers").select("id, email, source, created_at, unsubscribed_at").order("created_at", { ascending: false }).limit(2000);
  if (error) throw new Error(error.message);
  const active = rows.filter((r) => !r.unsubscribed_at).length;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-small text-muted">
        {active} active · {rows.length - active} unsubscribed
      </p>
      {!rows.length ? (
        <EmptyState title="No subscribers yet" description="Sign-ups from the homepage newsletter form appear here." />
      ) : (
        <div className="glass overflow-x-auto rounded-lg">
          <table className="w-full min-w-[40rem] text-left text-small">
            <caption className="sr-only">Newsletter subscribers</caption>
            <thead className="border-b border-line text-caption uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Email</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Joined</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.email}</td>
                  <td className="px-4 py-3 text-muted">{r.unsubscribed_at ? `Unsubscribed ${formatDate(r.unsubscribed_at)}` : "Active"}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <SubscriberDelete id={r.id} email={r.email} />
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
