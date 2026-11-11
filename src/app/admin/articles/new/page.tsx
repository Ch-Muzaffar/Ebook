import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ArticleForm } from "@/components/admin/article-form";
import { createArticleAction } from "@/lib/blog/actions";
import { formValuesFromArticle } from "@/lib/blog/validation";

export const metadata = { title: "New article" };

export default function NewArticlePage() {
  return (
    <>
      <AdminPageHeader title="New article" description="Write in Markdown; use Preview to check formatting before publishing." />
      <ArticleForm action={createArticleAction} initial={formValuesFromArticle()} mode="create" />
    </>
  );
}
