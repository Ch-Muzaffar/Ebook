import Image from "next/image";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArticleCard } from "@/components/cards/article-card";
import { Parallax } from "@/components/motion/effects";
import { Container } from "@/components/layout/container";
import { Heading, Text } from "@/components/ui/typography";
import type { Category } from "@/lib/categories/types";
import type { Article } from "@/lib/content/types";
import { formatDate } from "@/lib/format";
import { ArticleBody } from "./article-body";

/**
 * Full article layout — shared by the public article page and the admin preview, so a preview
 * looks exactly like the published page. Reading column is 760px (PRD §9.4); no 3D here.
 */
export function ArticleView({
  article,
  categories,
  related = [],
  adSlot,
  sidebarSlot,
}: {
  article: Article;
  categories: Category[];
  related?: Article[];
  /** Natural in-content ad position (after the article body). Renders nothing unless ads are enabled. */
  adSlot?: ReactNode;
  /** Optional desktop-only sidebar ad, beside the reading column on very wide screens. */
  sidebarSlot?: ReactNode;
}) {
  const cats = article.categories.map((s) => categories.find((c) => c.slug === s)).filter((c): c is Category => Boolean(c));

  return (
    <>
      <article>
        <Container width="prose" className="flex flex-col gap-6 pt-16 pb-10 md:pt-24">
          {cats.length > 0 && (
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-eyebrow font-medium uppercase">
              {cats.map((c, i) => (
                <span key={c.slug} className="flex gap-3">
                  {i > 0 && <span aria-hidden className="text-line">/</span>}
                  <Link href={`/blog/category/${c.slug}`} className="text-gold-deep hover:underline">
                    {c.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
          <Heading as="h1" size="h1" reveal>
            {article.title}
          </Heading>
          <Text size="lead" muted>
            {article.excerpt}
          </Text>
          <p className="text-small text-muted">
            By <span className="text-charcoal">{article.author}</span>
            {article.publishAt && (
              <>
                {" · "}
                <time dateTime={article.publishAt}>{formatDate(article.publishAt)}</time>
              </>
            )}
            {" · "}
            {article.readingMinutes} min read
          </p>
        </Container>

        {article.featuredImage && (
          <Container width="content" className="pb-4">
            <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-beige shadow-lift">
              {/* Slight parallax: the image is a little taller than its frame and drifts as you scroll. */}
              <Parallax distance={36} className="absolute inset-x-0 -inset-y-[7%]">
                <div className="relative h-full w-full">
                  <Image
                    src={article.featuredImage}
                    alt={article.featuredImageAlt ?? ""}
                    fill
                    priority
                    unoptimized={article.featuredImage.startsWith("http")}
                    sizes="(min-width: 1152px) 1152px, 100vw"
                    className="object-cover"
                  />
                </div>
              </Parallax>
            </div>
          </Container>
        )}

        <Container width="prose" className="relative border-t border-line pt-10 pb-16">
          {sidebarSlot}
          <ArticleBody markdown={article.content} />
          {adSlot}

          {article.tags.length > 0 && (
            <ul aria-label="Tags" className="mt-12 flex flex-wrap gap-2">
              {article.tags.map((t) => (
                <li key={t} className="rounded-pill bg-beige px-3 py-1 text-caption text-muted">
                  #{t}
                </li>
              ))}
            </ul>
          )}

          <aside aria-label="About the author" className="glass mt-12 flex flex-col gap-2 rounded-lg p-6">
            <p className="text-eyebrow font-medium uppercase text-gold-deep">Written by</p>
            <p className="font-serif text-h4">{article.author}</p>
            {article.authorBio && <p className="text-small text-muted">{article.authorBio}</p>}
          </aside>
        </Container>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="related-articles" className="border-t border-line bg-beige py-section">
          <Container>
            <Heading id="related-articles" className="mb-12">
              Keep reading
            </Heading>
            <ul className="grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
              {related.map((a) => (
                <li key={a.id}>
                  <ArticleCard article={a} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}
    </>
  );
}
