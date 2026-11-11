import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleView } from "@/components/blog/article-view";
import { LoadingIndicator } from "@/components/ui/states";
import { getPublishedArticle, getPublishedArticles, getRelatedArticles } from "@/lib/blog/queries";
import { getCategories } from "@/lib/categories/queries";
import { AdSlot } from "@/components/ads/ad-slot";
import { breadcrumbs, JsonLd } from "@/components/seo/json-ld";
import { getSiteSettings } from "@/lib/settings/queries";
import { siteUrl } from "@/lib/site-url";

// Public articles must be fully static. This also makes unknown slugs wait for the
// complete render, so notFound() returns a real 404 instead of a streamed 200.
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const articles = await getPublishedArticles();
  return articles.length ? articles.map((a) => ({ slug: a.slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const article = await getPublishedArticle((await params).slug);
  if (!article) return { title: "Article not found" };
  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.excerpt;
  return {
    // seoTitle is used verbatim (no site-name suffix) so authors control the full <title>.
    title: article.seoTitle ? { absolute: article.seoTitle } : article.title,
    description,
    alternates: { canonical: `/blog/${article.slug}` },
    authors: [{ name: article.author }],
    openGraph: {
      type: "article",
      title,
      description,
      publishedTime: article.publishAt,
      modifiedTime: article.updatedAt,
      authors: [article.author],
      tags: article.tags,
      ...(article.featuredImage ? { images: [{ url: article.featuredImage, alt: article.featuredImageAlt }] } : {}),
    },
  };
}

/** Reading layout: 760px max width (PRD §9.4), no 3D behind long-form text. */
export default function ArticlePage({ params }: PageProps<"/blog/[slug]">) {
  // Static shell; URL data is read only inside the Suspense-wrapped child (Instant Navigation rule).
  return (
    <Suspense fallback={<LoadingIndicator label="Loading article" className="min-h-[60vh] justify-center" />}>
      <ArticleContent params={params} />
    </Suspense>
  );
}

async function ArticleContent({ params }: { params: PageProps<"/blog/[slug]">["params"] }) {
  const article = await getPublishedArticle((await params).slug);
  if (!article) notFound();
  const [related, categories, settings] = await Promise.all([getRelatedArticles(article), getCategories(), getSiteSettings()]);
  const base = siteUrl();
  const primary = categories.find((c) => c.slug === article.categories[0]);
  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: article.title,
      description: article.seoDescription || article.excerpt,
      datePublished: article.publishAt,
      dateModified: article.updatedAt,
      author: { "@type": "Person", name: article.author },
      publisher: { "@type": "Organization", name: settings.brandName, url: base },
      mainEntityOfPage: { "@type": "WebPage", "@id": `${base}/blog/${article.slug}` },
      ...(article.featuredImage?.startsWith("http") ? { image: article.featuredImage } : {}),
      keywords: article.tags.join(", "),
      wordCount: article.content.split(/\s+/).filter(Boolean).length,
      ...(primary ? { articleSection: primary.name } : {}),
    },
    breadcrumbs(base, [
      { name: "Blog", path: "/blog" },
      ...(primary ? [{ name: primary.name, path: `/blog/category/${primary.slug}` }] : []),
      { name: article.title, path: `/blog/${article.slug}` },
    ]),
  ];
  return (
    <>
      <JsonLd data={structured} />
      <ArticleView article={article} categories={categories} related={related} adSlot={<AdSlot placement="article" />} sidebarSlot={<AdSlot placement="sidebar" />} />
    </>
  );
}
