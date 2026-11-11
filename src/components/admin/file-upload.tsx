"use client";

import { useId, useRef, useState } from "react";
import { browserDb } from "@/lib/supabase/browser";
import { createUploadAction, type UploadKind } from "@/lib/uploads/actions";

export type UploadedFile = { path: string; publicUrl?: string; name: string; size: number; type: string };

/**
 * File picker that uploads directly to Supabase Storage through a signed URL issued by an
 * admin-only Server Action. Calls onUploaded when the file is stored.
 */
export function FileUpload({
  kind,
  label,
  accept,
  onUploaded,
}: {
  kind: UploadKind;
  label: string;
  accept: string;
  onUploaded: (file: UploadedFile) => void | Promise<void>;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "busy" | "error" | "done"; text?: string }>({ kind: "idle" });

  async function upload(file: File) {
    setStatus({ kind: "busy", text: `Uploading ${file.name}…` });
    try {
      const ticket = await createUploadAction(kind, file.name, file.type, file.size);
      if ("error" in ticket && ticket.error) return setStatus({ kind: "error", text: ticket.error });
      const { bucket, path, token, publicUrl } = ticket as { bucket: string; path: string; token: string; publicUrl?: string };
      const { error } = await browserDb().storage.from(bucket).uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (error) return setStatus({ kind: "error", text: "Upload failed. Please try again." });
      await onUploaded({ path, publicUrl, name: file.name, size: file.size, type: file.type });
      setStatus({ kind: "done", text: `Uploaded ${file.name}.` });
    } catch {
      setStatus({ kind: "error", text: "Upload failed. Please check your connection and try again." });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-small font-medium">
        {label}
      </label>
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        disabled={status.kind === "busy"}
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        className="text-small file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-pill file:border file:border-charcoal file:bg-white file:px-4 file:text-small file:font-medium hover:file:bg-beige"
      />
      {status.text && (
        <p role={status.kind === "error" ? "alert" : "status"} className={status.kind === "error" ? "text-caption text-danger" : "text-caption text-muted"}>
          {status.text}
        </p>
      )}
    </div>
  );
}
