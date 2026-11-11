"use client";

import Link from "next/link";
import { useActionState, useState, useSyncExternalStore } from "react";
import { ArticleBody } from "@/components/blog/article-body";
import { useCategories } from "@/components/categories/categories-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FileUpload } from "./file-upload";
import type { ArticleFormState, ArticleFormValues } from "@/lib/blog/validation";
import { slugify } from "@/lib/catalog/validation";
import { cn } from "@/lib/cn";

type Action = (prev: ArticleFormState, fd: FormData) => Promise<ArticleFormState>;
const noop = () => () => {};

/** ISO → value for <input type="datetime-local"> in the browser's own time zone. */
function isoToLocalInput(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Counter({ value, max }: { value: string; max: number }) {
  return <span className={cn("text-caption tabular-nums", value.length > max ? "text-danger" : "text-muted")}>{value.length}/{max}</span>;
}

export function ArticleForm({ action, initial, mode }: { action: Action; initial: ArticleFormValues; mode: "create" | "edit" }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const v = state?.values ?? initial;
  const e = state?.errors ?? {};
  const categories = useCategories();
  // Timezone-dependent UI renders only after hydration (server and browser zones differ).
  const hydrated = useSyncExternalStore(noop, () => true, () => false);

  const [title, setTitle] = useState(v.title);
  const [slug, setSlug] = useState(v.slug);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [content, setContent] = useState(v.content);
  const [image, setImage] = useState(v.featuredImage);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [status, setStatus] = useState(v.status);
  const [localWhen, setLocalWhen] = useState<string | null>(null);
  const [seoTitle, setSeoTitle] = useState(v.seoTitle);
  const [seoDescription, setSeoDescription] = useState(v.seoDescription);
  const when = localWhen ?? (hydrated ? isoToLocalInput(v.publishAt) : "");
  const publishAtIso = when ? new Date(when).toISOString() : "";
  const errorCount = Object.keys(e).filter((k) => k !== "form").length;

  return (
    <form action={formAction} noValidate className="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-10">
        {e.form && (
          <p role="alert" className="rounded-md bg-danger/10 px-4 py-3 text-small text-danger">
            {e.form}
          </p>
        )}
        {errorCount > 0 && (
          <p role="alert" className="rounded-md bg-danger/10 px-4 py-3 text-small text-danger">
            Please fix {errorCount === 1 ? "the highlighted field" : `the ${errorCount} highlighted fields`} below.
          </p>
        )}

        <fieldset className="flex flex-col gap-5">
          <legend className="mb-4 font-serif text-h4">Article</legend>
          <Input
            label="Title"
            name="title"
            maxLength={150}
            value={title}
            onChange={(ev) => {
              setTitle(ev.target.value);
              if (!slugTouched) setSlug(slugify(ev.target.value));
            }}
            error={e.title}
          />
          <Input
            label="URL slug"
            name="slug"
            value={slug}
            onChange={(ev) => {
              setSlugTouched(true);
              setSlug(ev.target.value);
            }}
            hint={`The article's address: /blog/${slug || "…"}`}
            error={e.slug}
          />
          <Textarea label="Excerpt" name="excerpt" rows={3} maxLength={300} defaultValue={v.excerpt} hint="Shown on cards, as the article intro and as the default search description." error={e.excerpt} />

          {/* Content: Write / Preview */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-end justify-between gap-4">
              <label htmlFor="article-content" className="text-small font-medium">
                Content
              </label>
              <div role="tablist" aria-label="Editor mode" className="flex rounded-md bg-beige p-0.5">
                {(["write", "preview"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={cn("min-h-8 rounded px-3 text-caption font-medium capitalize", tab === t ? "bg-white shadow-hairline" : "text-muted")}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              id="article-content"
              name="content"
              value={content}
              onChange={(ev) => setContent(ev.target.value)}
              rows={22}
              aria-invalid={e.content ? true : undefined}
              aria-describedby="article-content-help"
              hidden={tab !== "write"}
              className={cn(
                "w-full rounded-md border bg-white px-4 py-3 font-mono text-small leading-relaxed focus-visible:border-charcoal focus-visible:outline-offset-1",
                e.content ? "border-danger" : "border-line hover:border-muted",
              )}
            />
            {tab === "preview" && (
              <div className="min-h-80 rounded-md border border-line bg-ivory px-6 py-8">
                {content.trim() ? <ArticleBody markdown={content} /> : <p className="text-small text-muted">Nothing to preview yet.</p>}
              </div>
            )}
            <p id="article-content-help" className={cn("text-caption", e.content ? "text-danger" : "text-muted")}>
              {e.content ??
                "Markdown: ## Heading, **bold**, *italic*, [link](https://…), - list, 1. numbered, > quote, | tables |. Raw HTML is not rendered."}
            </p>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-5">
          <legend className="mb-4 font-serif text-h4">Organisation</legend>
          <div className="flex flex-col gap-2">
            <p className="text-small font-medium">Categories</p>
            <p className="text-caption text-muted">Choose up to three. The earliest one in this list is shown as the primary category.</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((c) => (
                <label key={c.slug} className="glass flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 hover:ring-muted">
                  <input type="checkbox" name="categories" value={c.slug} defaultChecked={v.categories.includes(c.slug)} className="accent-charcoal" />
                  <span className="text-small">{c.name}</span>
                </label>
              ))}
            </div>
            {e.categories && <p className="text-caption text-danger">{e.categories}</p>}
          </div>
          <Input label="Tags" name="tags" defaultValue={v.tags} hint="Comma-separated, e.g. productivity, habits" error={e.tags} />
          <div className="glass grid gap-5 rounded-lg p-4 sm:grid-cols-2">
            <FileUpload kind="article-image" label="Upload a featured image" accept="image/jpeg,image/png,image/webp,image/avif" onUploaded={(f) => setImage(f.publicUrl ?? "")} />
            <Input label="…or image address" name="featuredImage" value={image} onChange={(ev) => setImage(ev.target.value)} placeholder="https://…" hint="Optional. JPG, PNG, WebP or AVIF up to 5 MB; landscape 16:9 works best." error={e.featuredImage} />
            <div className="sm:col-span-2">
              <Input label="Image description (alt text)" name="featuredImageAlt" defaultValue={v.featuredImageAlt} hint="Required when there is an image — describes it for screen readers." error={e.featuredImageAlt} />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary URL */}
            {/^https:\/\//.test(image) && <img src={image} alt="" className="max-h-40 rounded-md object-cover sm:col-span-2" />}
          </div>
          <div className="glass flex flex-col gap-2 rounded-lg p-4">
            <FileUpload
              kind="article-image"
              label="Insert an image into the article"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onUploaded={(f) => setContent((c) => `${c}${c && !c.endsWith("\n") ? "\n\n" : ""}![Describe the image](${f.publicUrl})\n`)}
            />
            <p className="text-caption text-muted">Adds the image at the end of the content as Markdown — move it where you want and replace “Describe the image”.</p>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-5">
          <legend className="mb-4 font-serif text-h4">Author</legend>
          <Input label="Author name" name="author" maxLength={120} defaultValue={v.author} error={e.author} />
          <Textarea label="Author bio (optional)" name="authorBio" rows={3} maxLength={400} defaultValue={v.authorBio} error={e.authorBio} />
        </fieldset>

        <fieldset className="flex flex-col gap-5">
          <legend className="mb-4 font-serif text-h4">Search engines</legend>
          <div className="flex flex-col gap-1">
            <Input label="SEO title (optional)" name="seoTitle" value={seoTitle} onChange={(ev) => setSeoTitle(ev.target.value)} hint="Defaults to the article title. Aim for 50–60 characters." error={e.seoTitle} />
            <Counter value={seoTitle} max={70} />
          </div>
          <div className="flex flex-col gap-1">
            <Textarea label="SEO description (optional)" name="seoDescription" rows={2} value={seoDescription} onChange={(ev) => setSeoDescription(ev.target.value)} hint="Defaults to the excerpt. Aim for 120–155 characters." error={e.seoDescription} />
            <Counter value={seoDescription} max={160} />
          </div>
          <div aria-label="Search result preview" className="glass rounded-md p-4">
            <p className="text-caption text-muted">Search result preview</p>
            <p className="mt-1 truncate text-[1.05rem] text-[#1a0dab]">{seoTitle || title || "Article title"}</p>
            <p className="line-clamp-2 text-small text-muted">{seoDescription || v.excerpt || "The excerpt appears here."}</p>
          </div>
        </fieldset>
      </div>

      {/* Sidebar: publishing */}
      <div className="glass flex flex-col gap-5 rounded-lg p-6 xl:sticky xl:top-8">
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-2 text-small font-medium">Publishing</legend>
          {[
            { value: "draft", label: "Draft", hint: "Hidden from the site" },
            { value: "published", label: "Publish now", hint: "Live as soon as you save" },
            { value: "scheduled", label: "Schedule", hint: "Goes live automatically at a set time" },
          ].map((o) => (
            <label key={o.value} className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-ivory">
              <input type="radio" name="status" value={o.value} checked={status === o.value} onChange={() => setStatus(o.value)} className="mt-1 accent-charcoal" />
              <span className="flex flex-col">
                <span className="text-small font-medium">{o.label}</span>
                <span className="text-caption text-muted">{o.hint}</span>
              </span>
            </label>
          ))}
          {e.status && <p className="text-caption text-danger">{e.status}</p>}
        </fieldset>

        {status === "scheduled" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="publish-when" className="text-small font-medium">
              Go live at
            </label>
            <input
              id="publish-when"
              type="datetime-local"
              value={when}
              onChange={(ev) => setLocalWhen(ev.target.value)}
              aria-invalid={e.publishAt ? true : undefined}
              className={cn("min-h-12 w-full rounded-md border bg-white px-3 text-small", e.publishAt ? "border-danger" : "border-line")}
            />
            <p className={cn("text-caption", e.publishAt ? "text-danger" : "text-muted")}>
              {e.publishAt ?? "Your local time. Live within a few minutes of this time."}
            </p>
          </div>
        )}
        <input type="hidden" name="publishAt" value={status === "scheduled" ? publishAtIso : v.publishAt} />

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : status === "draft" ? "Save draft" : status === "scheduled" ? "Schedule" : mode === "create" ? "Publish" : "Save & publish"}
        </Button>
        <Link href="/admin/articles" className="text-center text-small text-muted hover:text-charcoal">
          Cancel
        </Link>
      </div>
    </form>
  );
}
