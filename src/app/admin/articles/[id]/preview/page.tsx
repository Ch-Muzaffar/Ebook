import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleView } from "@/components/blog/article-view";
import { LoadingIndicator } from "@/components/ui/states";
import { getArticleForAdmin, isLive } from "@/lib/blog/queries";
import { getCategories } from "@/lib/categories/queries";

export const metadata = { title: "Preview" };

/** Admin-only preview (drafts included) using the exact public article layout. */
export default function PreviewArticlePage({ params }: PageProps<"/admin/articles/[id]/preview">) {
  return (
    <Suspense fallback={<LoadingIndicator label="Loading preview" />}>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: { params: PageProps<"/admin/articles/[id]/preview">["params"] }) {
  const { id } = await params;
  const [article, categories] = await Promise.all([getArticleForAdmin(id), getCategories()]);
  if (!article) notFound();
  const state = article.status === "draft" ? "Draft" : isLive(article) ? "Published" : "Scheduled";

  return (
    <div className="-mx-gutter overflow-hidden rounded-lg ring-1 ring-line lg:mx-0">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-charcoal px-5 py-3 text-small text-ivory">
        <span>
          Preview · <strong>{state}</strong> — this is how the article will look on the site.
        </span>
        <Link href={`/admin/articles/${id}`} className="underline underline-offset-4">
          Back to editor
        </Link>
      </div>
      <div className="bg-ivory">
        <ArticleView article={article} categories={categories} />
      </div>
    </div>
  );
}
