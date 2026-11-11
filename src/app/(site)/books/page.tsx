import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { ProductGrid, StoreBrowser } from "@/components/store/store-browser";
import { EmptyState } from "@/components/ui/states";
import { getPublishedProducts } from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Books",
  description: "Browse original eBooks on business, technology, AI, self-improvement, finance and more.",
};

export default async function BooksPage() {
  const products = await getPublishedProducts();

  return (
    <>
      <PageHeader eyebrow="The collection" title="Books" description="Original eBooks, thoughtfully made." />
      <Container className="py-section">
        {products.length ? (
          // useSearchParams needs a Suspense boundary; the fallback is the full, unfiltered
          // grid, so the prerendered HTML (and search engines) see every book.
          <Suspense fallback={<ProductGrid products={products} />}>
            <StoreBrowser products={products} />
          </Suspense>
        ) : (
          <EmptyState title="No books yet" description="New titles are on their way. Check back soon." />
        )}
      </Container>
    </>
  );
}
