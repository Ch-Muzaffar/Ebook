import { ArticleBody } from "@/components/blog/article-body";
import { Container } from "./container";
import { PageHeader } from "./page-header";

/** Policy text effective date — update whenever the wording of a legal page changes. */
export const LEGAL_UPDATED = "November 12, 2026";

/** Shared layout for Privacy / Terms / Refund: title block + 760px reading column of Markdown. */
export function LegalPage({ title, description, markdown }: { title: string; description?: string; markdown: string }) {
  return (
    <>
      <PageHeader eyebrow="Legal" title={title} description={description}>
        <p className="text-small text-muted">Last updated {LEGAL_UPDATED}</p>
      </PageHeader>
      <Container width="prose" className="py-section">
        <ArticleBody markdown={markdown} />
      </Container>
    </>
  );
}
