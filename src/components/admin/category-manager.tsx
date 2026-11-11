"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction, type CategoryFormState } from "@/lib/categories/actions";
import type { Category } from "@/lib/categories/types";

type Row = Category & { books: number; articles: number };

export function CategoryManager({ rows }: { rows: Row[] }) {
  return (
    <div className="flex flex-col gap-10">
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.id}>
            <CategoryRow row={r} />
          </li>
        ))}
      </ul>
      <NewCategory />
    </div>
  );
}

function Feedback({ state }: { state: CategoryFormState }) {
  if (!state) return null;
  return state.error ? (
    <p role="alert" className="text-caption text-danger">{state.error}</p>
  ) : (
    <p role="status" className="text-caption text-success">{state.ok}</p>
  );
}

function CategoryRow({ row }: { row: Row }) {
  const [state, action, pending] = useActionState(updateCategoryAction.bind(null, row.id), undefined);
  const [deleting, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const router = useRouter();
  const inUse = row.books + row.articles > 0;

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="glass grid gap-4 rounded-lg p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_5rem_auto] md:items-end">
      <Input label="Name" name="name" defaultValue={state?.values?.name ?? row.name} maxLength={60} />
      <Input label="Description" name="description" defaultValue={state?.values?.description ?? row.description ?? ""} maxLength={200} />
      <Input label="Order" name="order" inputMode="numeric" defaultValue={state?.values?.order ?? String(row.order)} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {confirm ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={deleting}
              className="bg-danger hover:bg-danger/90"
              onClick={() =>
                start(async () => {
                  const r = await deleteCategoryAction(row.id);
                  if (r.error) {
                    setDeleteError(r.error);
                    setConfirm(false);
                  } else router.refresh();
                })
              }
            >
              Confirm delete
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-danger"
            disabled={inUse}
            title={inUse ? "Move its books and articles to another category first" : undefined}
            onClick={() => setConfirm(true)}
            aria-label={`Delete ${row.name}`}
          >
            Delete
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted md:col-span-4">
        <span>/{row.slug}</span>
        <span>{row.books} book(s)</span>
        <span>{row.articles} article(s)</span>
        <Feedback state={state} />
        {deleteError && <p role="alert" className="text-caption text-danger">{deleteError}</p>}
      </div>
    </form>
  );
}

function NewCategory() {
  const [state, action, pending] = useActionState(createCategoryAction, undefined);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border border-dashed border-line p-5">
      <h2 className="font-serif text-h4">Add a category</h2>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)_auto] md:items-end">
        <Input label="Name" name="name" maxLength={60} required defaultValue={state?.values?.name} />
        <Input label="Slug (optional)" name="slug" defaultValue={state?.values?.slug} hint="Generated from the name if empty. Can't be changed later." />
        <Input label="Description" name="description" maxLength={200} defaultValue={state?.values?.description} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
