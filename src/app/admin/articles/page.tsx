import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ArticleRowActions } from "@/components/admin/article-row-actions";
import { CategoryName } from "@/components/categories/categories-provider";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, LoadingIndicator } from "@/components/ui/states";
import { getAllArticlesForAdmin } from "@/lib/blog/queries";
import { cn } from "@/lib/cn";

export const metadata = { title: "Articles" };

const FLASH: Record<string, string> = { created: "Article created.", updated: "Changes saved." };

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";

export default function AdminArticlesPage({ searchParams }: PageProps<"/admin/articles">) {
  return (
    <>
      <AdminPageHeader
        title="Articles"
        description="Write, schedule and publish blog posts. Drafts and scheduled posts stay hidden until they go live."
        actions={<LinkButton href="/admin/articles/new" size="sm">New article</LinkButton>}
      />
      <Suspense fallback={<LoadingIndicator label="Loading articles" />}>
        <ArticleTable searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ArticleTable({ searchParams }: { searchParams: PageProps<"/admin/articles">["searchParams"] }) {
  const saved = (await searchParams).saved;
  const flash = typeof saved === "string" ? FLASH[saved] : undefined;
  const articles = await getAllArticlesForAdmin();

  return (
    <div className="flex flex-col gap-6">
      {flash && (
        <p role="status" className="rounded-md bg-success/10 px-4 py-3 text-small text-success">
          {flash}
        </p>
      )}
      {!articles.length ? (
        <EmptyState title="No articles yet" description="Write your first article." action={<LinkButton href="/admin/articles/new">New article</LinkButton>} />
      ) : (
        <div className="glass overflow-x-auto rounded-lg">
          <table className="w-full min-w-[50rem] text-left text-small">
            <caption className="sr-only">All articles</caption>
            <thead className="border-b border-line text-caption uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Article</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Category</th>
                <th scope="col" className="px-4 py-3 font-medium">Goes live</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {articles.map((a) => {
                const live = a.live;
                const label = a.status === "draft" ? "Draft" : live ? "Published" : "Scheduled";
                return (
                  <tr key={a.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{a.title}</p>
                      <p className="truncate text-caption text-muted">/blog/{a.slug} · {a.readingMinutes} min read</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-pill px-2.5 py-1 text-caption font-medium",
                          label === "Published" && "bg-success/10 text-success",
                          label === "Scheduled" && "bg-gold/20 text-gold-deep",
                          label === "Draft" && "bg-beige text-muted",
                        )}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{a.categories[0] && <CategoryName slug={a.categories[0]} />}</td>
                    <td className="px-4 py-3 text-muted">{a.publishAt ? dateTime(a.publishAt) : "—"}</td>
                    <td className="px-4 py-3">
                      <ArticleRowActions id={a.id} slug={a.slug} title={a.title} live={live} status={a.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
