import type { Metadata } from "next";
import { BlogCategoryNav } from "@/components/blog/category-nav";
import { ArticleCard } from "@/components/cards/article-card";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/states";
import { getPublishedArticles } from "@/lib/blog/queries";
import { getCategories } from "@/lib/categories/queries";

export const metadata: Metadata = {
  title: "Blog",
  description: "Original articles on business, technology, AI, self-improvement, education, finance and digital skills.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const [articles, categories] = await Promise.all([getPublishedArticles(), getCategories()]);
  const withArticles = categories.filter((c) => articles.some((a) => a.categories.includes(c.slug)));
  const [lead, ...rest] = articles;

  return (
    <>
      <PageHeader eyebrow="Journal" title="Articles" description="Ideas, guides and reviews — written to be useful.">
        {withArticles.length > 0 && <BlogCategoryNav categories={withArticles} />}
      </PageHeader>
      <Container className="py-section">
        {!lead ? (
          <EmptyState title="No articles yet" description="New writing is on its way. Check back soon." />
        ) : (
          <div className="flex flex-col gap-16">
            <ArticleCard article={lead} size="lead" />
            {rest.length > 0 && (
              <ul className="grid gap-x-8 gap-y-14 border-t border-line pt-16 md:grid-cols-2 lg:grid-cols-3">
                {rest.map((a) => (
                  <li key={a.id}>
                    <ArticleCard article={a} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Container>
    </>
  );
}
