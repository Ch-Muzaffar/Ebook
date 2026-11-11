import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { BookCover } from "@/components/cards/book-cover";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, LoadingIndicator } from "@/components/ui/states";
import { getAllProductsForAdmin } from "@/lib/catalog/queries";
import { cn } from "@/lib/cn";
import { CategoryName } from "@/components/categories/categories-provider";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Books" };

const FLASH: Record<string, string> = {
  created: "Book created.",
  updated: "Changes saved.",
  deleted: "Book deleted.",
};

export default function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  return (
    <>
      <AdminPageHeader
        title="Books"
        description="Create, edit, publish and remove eBooks. Drafts are never shown on the public site."
        actions={<LinkButton href="/admin/products/new" size="sm">New book</LinkButton>}
      />
      <Suspense fallback={<LoadingIndicator label="Loading books" />}>
        <ProductTable searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ProductTable({ searchParams }: { searchParams: PageProps<"/admin/products">["searchParams"] }) {
  const saved = (await searchParams).saved;
  const flash = typeof saved === "string" ? FLASH[saved] : undefined;
  const products = await getAllProductsForAdmin();

  return (
    <div className="flex flex-col gap-6">
      {flash && (
        <p role="status" className="rounded-md bg-success/10 px-4 py-3 text-small text-success">
          {flash}
        </p>
      )}
      {!products.length ? (
        <EmptyState
          title="No books yet"
          description="Create your first eBook to see it in the store."
          action={<LinkButton href="/admin/products/new">New book</LinkButton>}
        />
      ) : (
        <div className="glass overflow-x-auto rounded-lg">
          <table className="w-full min-w-[46rem] text-left text-small">
            <caption className="sr-only">All books</caption>
            <thead className="border-b border-line text-caption uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Book</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Category</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Price</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((p) => (
                <tr key={p.id} className="align-middle">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 shrink-0">
                        <BookCover product={p} sizes="36px" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">
                          {p.title}
                          {p.featured && (
                            <span className="ml-2 rounded-pill bg-gold/20 px-2 py-0.5 text-[0.6875rem] font-medium text-gold-deep">
                              Featured
                            </span>
                          )}
                        </p>
                        <p className="truncate text-caption text-muted">/books/{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-pill px-2.5 py-1 text-caption font-medium",
                        p.status === "published" ? "bg-success/10 text-success" : "bg-beige text-muted",
                      )}
                    >
                      {p.status === "published" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    <CategoryName slug={p.category} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatPrice(p.priceCents)}</td>
                  <td className="px-4 py-3">
                    <ProductRowActions id={p.id} slug={p.slug} title={p.title} status={p.status} />
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
