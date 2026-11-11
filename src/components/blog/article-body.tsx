import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders article Markdown with the editorial reading styles (PRD §9.4).
 * Safe by default: react-markdown never renders raw HTML and strips unsafe URLs
 * (e.g. javascript:), so article content cannot inject scripts.
 */
/** Plain-text headings get a stable anchor id ("## Cookies" → #cookies) so sections can be linked. */
function anchor(children: unknown) {
  return typeof children === "string"
    ? children.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || undefined
    : undefined;
}

const components: Components = {
  h1: (p) => <h2 className="mt-12 font-serif text-h2" {...p} />, // only the page title is an h1
  h2: (p) => <h2 id={anchor(p.children)} className="mt-12 scroll-mt-[calc(var(--spacing-header)+1rem)] font-serif text-h3" {...p} />,
  h3: (p) => <h3 id={anchor(p.children)} className="mt-10 font-serif text-h4" {...p} />,
  h4: (p) => <h4 className="mt-8 text-body font-semibold" {...p} />,
  p: (p) => <p className="mt-6 text-body leading-[1.8] text-charcoal" {...p} />,
  a: ({ href = "", ...p }) => {
    const external = /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        className="text-gold-deep underline decoration-gold/50 underline-offset-4 hover:decoration-gold-deep"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...p}
      />
    );
  },
  ul: (p) => <ul className="mt-6 flex list-disc flex-col gap-2 pl-6 marker:text-gold" {...p} />,
  ol: (p) => <ol className="mt-6 flex list-decimal flex-col gap-2 pl-6 marker:text-gold-deep" {...p} />,
  li: (p) => <li className="pl-1 leading-[1.75]" {...p} />,
  blockquote: (p) => <blockquote className="mt-8 border-l-2 border-gold pl-6 font-serif text-lead italic text-charcoal" {...p} />,
  hr: () => <hr className="my-12 border-line" />,
  strong: (p) => <strong className="font-semibold" {...p} />,
  // eslint-disable-next-line @next/next/no-img-element -- arbitrary author-supplied URLs; plain lazy img avoids a remote-host allow-list
  img: ({ src, alt }) => <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" className="mt-8 w-full rounded-lg" />,
  code: ({ className, ...p }) => (
    <code className={className ?? "rounded-sm bg-beige px-1.5 py-0.5 font-mono text-[0.9em]"} {...p} />
  ),
  pre: (p) => <pre className="mt-6 overflow-x-auto rounded-lg bg-ink p-5 font-mono text-small text-paper ring-1 ring-line" {...p} />,
  table: (p) => (
    <div className="mt-8 overflow-x-auto rounded-lg ring-1 ring-line">
      <table className="w-full text-left text-small" {...p} />
    </div>
  ),
  thead: (p) => <thead className="bg-beige" {...p} />,
  th: (p) => <th className="px-4 py-3 font-semibold" {...p} />,
  td: (p) => <td className="border-t border-line px-4 py-3" {...p} />,
};

export function ArticleBody({ markdown }: { markdown: string }) {
  return (
    <div className="[&>*:first-child]:mt-0">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </Markdown>
    </div>
  );
}
