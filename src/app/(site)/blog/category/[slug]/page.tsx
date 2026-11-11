import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BlogCategoryNav } from "@/components/blog/category-nav";
import { ArticleCard } from "@/components/cards/article-card";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, LoadingIndicator } from "@/components/ui/states";
import { getArticlesInCategory, getPublishedArticles } from "@/lib/blog/queries";
import { getCategories, getCategory } from "@/lib/categories/queries";

// Public, fully static; unknown categories return a real 404 (see books/[slug] for the rationale).
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.length ? categories.map((c) => ({ slug: c.slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/blog/category/[slug]">): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  if (!category) return { title: "Category not found" };
  return {
    title: `${category.name} articles`,
    description: category.description ?? `Articles about ${category.name}.`,
    alternates: { canonical: `/blog/category/${category.slug}` },
  };
}

export default function BlogCategoryPage({ params }: PageProps<"/blog/category/[slug]">) {
  return (
    <Suspense fallback={<LoadingIndicator label="Loading articles" className="min-h-[60vh] justify-center" />}>
      <CategoryArticles params={params} />
    </Suspense>
  );
}

async function CategoryArticles({ params }: { params: PageProps<"/blog/category/[slug]">["params"] }) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const [articles, all, categories] = await Promise.all([getArticlesInCategory(slug), getPublishedArticles(), getCategories()]);
  const withArticles = categories.filter((c) => all.some((a) => a.categories.includes(c.slug)));

  return (
    <>
      <PageHeader eyebrow="Journal" title={category.name} description={category.description}>
        <BlogCategoryNav categories={withArticles.some((c) => c.slug === slug) ? withArticles : [...withArticles, category]} active={slug} />
      </PageHeader>
      <Container className="py-section">
        {articles.length ? (
          <ul className="grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <li key={a.id}>
                <ArticleCard article={a} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={`No ${category.name} articles yet`}
            description="New writing in this category is on its way."
            action={<LinkButton href="/blog" variant="secondary">All articles</LinkButton>}
          />
        )}
      </Container>
    </>
  );
}
