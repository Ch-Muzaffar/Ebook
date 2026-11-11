"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { BookCover } from "@/components/cards/book-cover";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FileUpload } from "./file-upload";
import { useCategories } from "@/components/categories/categories-provider";
import { slugify, type ProductFormState, type ProductFormValues } from "@/lib/catalog/validation";
import type { CoverTone } from "@/lib/content/types";

type Action = (prev: ProductFormState, fd: FormData) => Promise<ProductFormState>;

/**
 * Create / edit a book. Validation runs on the server (the source of truth); errors and the
 * submitted values come back through useActionState so nothing typed is lost.
 */
export function ProductForm({ action, initial, mode }: { action: Action; initial: ProductFormValues; mode: "create" | "edit" }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const categories = useCategories();
  const v = state?.values ?? initial;
  const e = state?.errors ?? {};
  // Live preview of the placeholder cover; slug follows the title until edited by hand.
  const [title, setTitle] = useState(v.title);
  const [author, setAuthor] = useState(v.author);
  const [tone, setTone] = useState(v.coverTone);
  const [cover, setCover] = useState(v.coverImage);
  const [slug, setSlug] = useState(v.slug);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const errorCount = Object.keys(e).filter((k) => k !== "form").length;

  return (
    <form action={formAction} noValidate className="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="flex flex-col gap-10">
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
          <legend className="mb-4 font-serif text-h4">Basics</legend>
          <Input
            label="Title"
            name="title"
            required
            maxLength={120}
            value={title}
            onChange={(ev) => {
              setTitle(ev.target.value);
              if (!slugTouched) setSlug(slugify(ev.target.value));
            }}
            error={e.title}
          />
          <Input label="Subtitle" name="subtitle" maxLength={160} defaultValue={v.subtitle} error={e.subtitle} />
          <Input
            label="URL slug"
            name="slug"
            value={slug}
            onChange={(ev) => {
              setSlugTouched(true);
              setSlug(ev.target.value);
            }}
            hint={`The book's address: /books/${slug || "…"}`}
            error={e.slug}
          />
          <Input label="Author" name="author" required maxLength={120} value={author} onChange={(ev) => setAuthor(ev.target.value)} error={e.author} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Select label="Category" name="category" defaultValue={v.category || categories[0]?.slug} error={e.category} options={categories.map((c) => ({ value: c.slug, label: c.name }))} />
            <Input label="Price (USD)" name="price" inputMode="decimal" placeholder="19.00" defaultValue={v.price} error={e.price} />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-5">
          <legend className="mb-4 font-serif text-h4">Description</legend>
          <Textarea
            label="Short description"
            name="description"
            maxLength={300}
            rows={3}
            defaultValue={v.description}
            hint="One or two sentences, shown on book cards (300 characters max)."
            error={e.description}
          />
          <Textarea
            label="Full description"
            name="longDescription"
            rows={8}
            defaultValue={v.longDescription}
            hint="Shown on the book page. Leave a blank line between paragraphs."
            error={e.longDescription}
          />
          <Textarea
            label="Table of contents"
            name="tableOfContents"
            rows={6}
            defaultValue={v.tableOfContents}
            hint="One chapter per line. Optional."
            error={e.tableOfContents}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-5">
          <legend className="mb-4 font-serif text-h4">Details</legend>
          <div className="grid gap-5 sm:grid-cols-3">
            <Input label="Format" name="format" defaultValue={v.format} hint="e.g. PDF & EPUB" error={e.format} />
            <Input label="Pages" name="pages" inputMode="numeric" defaultValue={v.pages} error={e.pages} />
            <Input label="Language" name="language" defaultValue={v.language} error={e.language} />
          </div>
          <div className="glass grid gap-4 rounded-lg p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
            <FileUpload kind="cover" label="Upload a cover image" accept="image/jpeg,image/png,image/webp,image/avif" onUploaded={(f) => setCover(f.publicUrl ?? "")} />
            <Input
              label="…or cover image address"
              name="coverImage"
              value={cover}
              onChange={(ev) => setCover(ev.target.value)}
              placeholder="https://…"
              hint="JPG, PNG, WebP or AVIF, up to 5 MB. Portrait 2:3 works best."
              error={e.coverImage}
            />
            {cover && (
              <button type="button" onClick={() => setCover("")} className="justify-self-start text-caption text-danger underline">
                Remove cover image
              </button>
            )}
          </div>
          <Select
            label="Placeholder cover colour"
            name="coverTone"
            value={tone}
            onChange={(ev) => setTone(ev.target.value)}
            error={e.coverTone}
            hint="Used when there is no cover image."
            options={[
              { value: "charcoal", label: "Charcoal" },
              { value: "gold", label: "Gold" },
              { value: "beige", label: "Beige" },
            ]}
          />
        </fieldset>
      </div>

      {/* Sidebar: visibility + save */}
      <div className="glass flex flex-col gap-6 rounded-lg p-6 xl:sticky xl:top-8">
        <div className="mx-auto w-28">
          <BookCover
            product={{ title: title || "Untitled", author: author || "Author", coverTone: tone as CoverTone, coverImage: /^(https:\/\/|\/)/.test(cover) ? cover : undefined }}
            sizes="112px"
          />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-small font-medium">Visibility</legend>
          {[
            { value: "draft", label: "Draft", hint: "Hidden from the site" },
            { value: "published", label: "Published", hint: "Visible in the store" },
          ].map((o) => (
            <label key={o.value} className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-ivory">
              <input type="radio" name="status" value={o.value} defaultChecked={v.status === o.value} className="mt-1 accent-charcoal" />
              <span className="flex flex-col">
                <span className="text-small font-medium">{o.label}</span>
                <span className="text-caption text-muted">{o.hint}</span>
              </span>
            </label>
          ))}
          {e.status && <p className="text-caption text-danger">{e.status}</p>}
        </fieldset>
        <label className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-ivory">
          <input type="checkbox" name="featured" defaultChecked={v.featured === "on"} className="mt-1 accent-charcoal" />
          <span className="flex flex-col">
            <span className="text-small font-medium">Feature on homepage</span>
            <span className="text-caption text-muted">The first three featured books appear in the 3D library.</span>
          </span>
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create book" : "Save changes"}
        </Button>
        <Link href="/admin/products" className="text-center text-small text-muted hover:text-charcoal">
          Cancel
        </Link>
      </div>
    </form>
  );
}
