import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";
import { AddToBagButton } from "@/components/cart/add-to-bag-button";
import { Book3D } from "@/components/cards/book-3d";
import { BookCover } from "@/components/cards/book-cover";
import { ProductCard } from "@/components/cards/product-card";
import { Container } from "@/components/layout/container";
import { LoadingIndicator } from "@/components/ui/states";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";
import { getPublishedProduct, getPublishedProducts, getRelatedProducts } from "@/lib/catalog/queries";
import { categoryNameOf } from "@/lib/categories/queries";
import { breadcrumbs, JsonLd } from "@/components/seo/json-ld";
import { getSiteSettings } from "@/lib/settings/queries";
import { siteUrl } from "@/lib/site-url";
import { formatDate, formatPrice } from "@/lib/format";

// Public product pages must be fully static. This also makes unknown slugs wait for the
// complete render, so notFound() returns a real 404 instead of a streamed 200.
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const products = await getPublishedProducts();
  // ensureStatic requires at least one param set; a placeholder slug 404s if the catalog is empty.
  return products.length ? products.map((p) => ({ slug: p.slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/books/[slug]">): Promise<Metadata> {
  const product = await getPublishedProduct((await params).slug);
  if (!product) return { title: "Book not found" };
  return {
    title: product.title,
    description: product.description,
    alternates: { canonical: `/books/${product.slug}` },
    openGraph: {
      type: "book",
      title: product.title,
      description: product.description,
      authors: [product.author],
      ...(product.coverImage?.startsWith("http") ? { images: [{ url: product.coverImage, alt: `Cover of ${product.title}` }] } : {}),
    },
  };
}

/**
 * The page itself stays static (instant App Shell); URL data (`params`) is only read inside
 * the Suspense-wrapped child, as Next 16's Instant Navigation validation requires.
 */
export default function BookDetailsPage({ params }: PageProps<"/books/[slug]">) {
  return (
    <Suspense fallback={<LoadingIndicator label="Loading book" className="min-h-[60vh] justify-center" />}>
      <BookDetails params={params} />
    </Suspense>
  );
}

async function BookDetails({ params }: { params: PageProps<"/books/[slug]">["params"] }) {
  const product = await getPublishedProduct((await params).slug);
  if (!product) notFound();
  const [related, categoryName, settings] = await Promise.all([getRelatedProducts(product), categoryNameOf(product.category), getSiteSettings()]);
  const base = siteUrl();
  const url = `${base}/books/${product.slug}`;
  const structured = [
    {
      "@context": "https://schema.org",
      "@type": ["Book", "Product"],
      name: product.title,
      ...(product.subtitle ? { alternativeHeadline: product.subtitle } : {}),
      description: product.description,
      url,
      author: { "@type": "Person", name: product.author },
      publisher: { "@type": "Organization", name: settings.brandName },
      bookFormat: "https://schema.org/EBook",
      ...(product.pages ? { numberOfPages: product.pages } : {}),
      ...(product.language ? { inLanguage: product.language } : {}),
      ...(product.coverImage?.startsWith("http") ? { image: product.coverImage } : {}),
      category: categoryName,
      offers: {
        "@type": "Offer",
        price: (product.priceCents / 100).toFixed(2),
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url,
      },
    },
    breadcrumbs(base, [
      { name: "Books", path: "/books" },
      { name: categoryName, path: `/books?category=${product.category}` },
      { name: product.title, path: `/books/${product.slug}` },
    ]),
  ];
  const paragraphs = (product.longDescription ?? product.description).split(/\n\s*\n/).filter(Boolean);

  const details = [
    { label: "Format", value: product.format },
    product.pages ? { label: "Length", value: `${product.pages} pages` } : null,
    product.language ? { label: "Language", value: product.language } : null,
    product.publishedAt ? { label: "Published", value: formatDate(product.publishedAt) } : null,
  ].filter((d): d is { label: string; value: string } => d !== null);

  return (
    <>
      <JsonLd data={structured} />
      <Container className="py-section">
        <nav aria-label="Breadcrumb" className="mb-10 text-small text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/books" className="hover:text-charcoal">
                Books
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href={`/books?category=${product.category}`} className="hover:text-charcoal">
                {categoryName}
              </Link>
            </li>
          </ol>
        </nav>

        <div className="grid items-start gap-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-20">
          <div className="glass relative mx-auto w-full max-w-sm overflow-hidden rounded-lg px-[15%] py-[13%] md:sticky md:top-[calc(var(--spacing-header)+2rem)]">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(65%_55%_at_50%_40%,color-mix(in_oklab,var(--color-gold)_28%,transparent),transparent)]"
            />
            <ViewTransition name={`book-${product.slug}`} share="morph" default="none">
              <div>
                <Book3D tone={product.coverTone} rest={-20} range={18} interactive="window">
                  <BookCover product={product} sizes="(min-width: 768px) 30vw, 80vw" />
                </Book3D>
              </div>
            </ViewTransition>
          </div>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <Eyebrow>{categoryName}</Eyebrow>
              <Heading as="h1" size="h1" reveal>
                {product.title}
              </Heading>
              {product.subtitle && (
                <Text size="lead" muted>
                  {product.subtitle}
                </Text>
              )}
              <Text muted>by {product.author}</Text>
            </div>

            <div className="flex flex-col gap-5 border-y border-line py-6">
              <p className="text-foil w-fit font-serif text-h2">{formatPrice(product.priceCents)}</p>
              <AddToBagButton slug={product.slug} title={product.title} />
              <p className="text-caption text-muted">Instant digital download after purchase. Prices in USD.</p>
            </div>

            <section aria-labelledby="about-heading" className="flex flex-col gap-4">
              <h2 id="about-heading" className="font-serif text-h4">
                About this book
              </h2>
              {paragraphs.map((para, i) => (
                <Text key={i}>{para}</Text>
              ))}
            </section>

            <dl className="glass grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg p-6 text-small sm:grid-cols-4">
              {details.map((d) => (
                <div key={d.label}>
                  <dt className="text-muted">{d.label}</dt>
                  <dd className="font-medium">{d.value}</dd>
                </div>
              ))}
            </dl>

            {product.tableOfContents?.length ? (
              <section aria-labelledby="toc-heading" className="flex flex-col gap-4">
                <h2 id="toc-heading" className="font-serif text-h4">
                  Table of contents
                </h2>
                <ol className="flex flex-col divide-y divide-line border-y border-line">
                  {product.tableOfContents.map((item, i) => (
                    <li key={i} className="flex gap-4 py-3 text-small">
                      <span className="w-6 shrink-0 text-gold-deep tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                      {item}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>
        </div>
      </Container>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="border-t border-line bg-beige py-section">
          <Container>
            <Heading id="related-heading" className="mb-12">
              You may also like
            </Heading>
            <ul className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}
    </>
  );
}
