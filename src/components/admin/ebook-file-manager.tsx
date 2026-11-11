"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { attachProductFileAction, removeProductFileAction } from "@/lib/uploads/actions";
import { FileUpload } from "./file-upload";

export type ProductFileInfo = { fileName: string; sizeBytes: number; uploadedAt: string } | null;

const mb = (b: number) => `${(b / 1024 / 1024).toFixed(b < 10 * 1024 * 1024 ? 1 : 0)} MB`;

/** The private, downloadable eBook file for a product (stored in the private bucket). */
export function EbookFileManager({ productId, file }: { productId: string; file: ProductFileInfo }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <section aria-labelledby="ebook-file-heading" className="glass flex flex-col gap-4 rounded-lg p-6">
      <div className="flex flex-col gap-1">
        <h2 id="ebook-file-heading" className="font-serif text-h4">eBook file</h2>
        <p className="text-caption text-muted">
          Stored privately — customers can only download it through a time-limited link after a verified purchase (Phase 6).
        </p>
      </div>
      {file ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-ivory px-4 py-3 text-small">
          <span>
            <strong className="font-medium">{file.fileName}</strong> · {mb(file.sizeBytes)} · uploaded {new Date(file.uploadedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => start(async () => { await removeProductFileAction(productId); router.refresh(); })}
            className="text-caption text-danger underline disabled:opacity-50"
          >
            Remove file
          </button>
        </div>
      ) : (
        <p className="rounded-md bg-gold/15 px-4 py-3 text-small text-charcoal">No file uploaded yet — this book can&apos;t be delivered until one is.</p>
      )}
      <FileUpload
        kind="ebook"
        label={file ? "Replace with a new file" : "Upload the eBook (PDF or EPUB, up to 200 MB)"}
        accept="application/pdf,application/epub+zip,.pdf,.epub"
        onUploaded={async (f) => {
          const r = await attachProductFileAction(productId, f.path, f.name, f.size, f.type);
          if (r.error) setError(r.error);
          else router.refresh();
        }}
      />
      {error && <p role="alert" className="text-caption text-danger">{error}</p>}
    </section>
  );
}
