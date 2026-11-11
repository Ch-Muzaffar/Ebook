import { BookCover } from "@/components/cards/book-cover";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { formatDate, formatPrice } from "@/lib/format";
import { sessionDb } from "@/lib/supabase/server";

const STATUS: Record<string, string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  refunded: "Refunded",
  partially_refunded: "Partly refunded",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** Customer library + order history (RLS: a customer only ever sees their own rows). */
export async function Library({ userId }: { userId: string }) {
  const db = await sessionDb();
  const [{ data: books }, { data: orders }] = await Promise.all([
    db
      .from("downloads")
      .select("product_id, granted_at, download_count, products(title, author, format, cover_image, cover_tone, slug)")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("granted_at", { ascending: false }),
    db
      .from("orders")
      .select("id, status, total_cents, subtotal_cents, created_at, receipt_url, order_items(title)")
      .eq("user_id", userId)
      .in("status", ["paid", "refunded", "partially_refunded"])
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  type Book = { product_id: string; download_count: number; products: { title: string; author: string; format: string; cover_image: string | null; cover_tone: "charcoal" | "gold" | "beige"; slug: string } | null };
  const list = ((books ?? []) as unknown as Book[]).filter((b) => b.products);

  return (
    <div className="flex flex-col gap-14">
      <section aria-labelledby="library-heading" className="flex flex-col gap-6">
        <h2 id="library-heading" className="font-serif text-h3">My books</h2>
        {!list.length ? (
          <EmptyState title="No books yet" description="Books you buy will appear here, ready to download." action={<LinkButton href="/books">Explore Books</LinkButton>} />
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((b) => (
              <li key={b.product_id} className="glass flex gap-4 rounded-lg p-4">
                <div className="w-20 shrink-0">
                  <BookCover
                    product={{ title: b.products!.title, author: b.products!.author, coverTone: b.products!.cover_tone, coverImage: b.products!.cover_image ?? undefined }}
                    sizes="80px"
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-serif text-h4 leading-tight">{b.products!.title}</p>
                  <p className="text-caption text-muted">{b.products!.author} · {b.products!.format}</p>
                  <a
                    href={`/api/download/${b.product_id}`}
                    className="mt-auto inline-flex min-h-10 w-fit items-center rounded-pill bg-charcoal px-5 text-small font-medium text-ivory hover:bg-charcoal-soft"
                    aria-label={`Download ${b.products!.title}`}
                  >
                    Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(orders?.length ?? 0) > 0 && (
        <section aria-labelledby="orders-heading" className="flex flex-col gap-4">
          <h2 id="orders-heading" className="font-serif text-h4">Order history</h2>
          <div className="glass overflow-x-auto rounded-lg">
            <table className="w-full min-w-[36rem] text-left text-small">
              <thead className="border-b border-line text-caption uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Date</th>
                  <th scope="col" className="px-4 py-3 font-medium">Books</th>
                  <th scope="col" className="px-4 py-3 font-medium">Total</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Receipt</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders!.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3">{(o.order_items as { title: string }[]).map((i) => i.title).join(", ")}</td>
                    <td className="px-4 py-3">{formatPrice(o.total_cents ?? o.subtotal_cents)}</td>
                    <td className="px-4 py-3">{STATUS[o.status] ?? o.status}</td>
                    <td className="px-4 py-3 text-right">
                      {o.receipt_url && (
                        <a href={o.receipt_url} target="_blank" rel="noopener noreferrer" className="text-gold-deep underline underline-offset-4">
                          Receipt
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
