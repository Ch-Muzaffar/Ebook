import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ArticleForm } from "@/components/admin/article-form";
import { LinkButton } from "@/components/ui/button";
import { LoadingIndicator } from "@/components/ui/states";
import { updateArticleAction } from "@/lib/blog/actions";
import { getArticleForAdmin } from "@/lib/blog/queries";
import { formValuesFromArticle } from "@/lib/blog/validation";

export const metadata = { title: "Edit article" };

export default function EditArticlePage({ params }: PageProps<"/admin/articles/[id]">) {
  return (
    <Suspense fallback={<LoadingIndicator label="Loading article" />}>
      <EditArticle params={params} />
    </Suspense>
  );
}

async function EditArticle({ params }: { params: PageProps<"/admin/articles/[id]">["params"] }) {
  const article = await getArticleForAdmin((await params).id);
  if (!article) notFound();
  return (
    <>
      <AdminPageHeader
        title={`Edit: ${article.title}`}
        description="Saved changes to a live article appear on the site immediately."
        actions={<LinkButton href={`/admin/articles/${article.id}/preview`} variant="secondary" size="sm">Preview saved version</LinkButton>}
      />
      <ArticleForm action={updateArticleAction.bind(null, article.id)} initial={formValuesFromArticle(article)} mode="edit" />
    </>
  );
}
