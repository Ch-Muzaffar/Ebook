"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { PRODUCTS_TAG } from "@/lib/catalog/queries";
import { sessionDb } from "@/lib/supabase/server";
import { serviceDb } from "@/lib/supabase/service";

export type UploadKind = "cover" | "article-image" | "ebook";

const RULES: Record<UploadKind, { bucket: string; types: string[]; maxBytes: number }> = {
  cover: { bucket: "public-media", types: ["image/jpeg", "image/png", "image/webp", "image/avif"], maxBytes: 5 * 1024 * 1024 },
  "article-image": { bucket: "public-media", types: ["image/jpeg", "image/png", "image/webp", "image/avif"], maxBytes: 5 * 1024 * 1024 },
  ebook: { bucket: "ebook-files", types: ["application/pdf", "application/epub+zip"], maxBytes: 200 * 1024 * 1024 },
};

const safeName = (name: string) =>
  name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-80) || "file";

/**
 * Step 1 of an upload: an admin asks for a one-time signed upload URL. The browser then sends the
 * file straight to Supabase Storage (large eBooks never pass through this server). The bucket's own
 * size/type limits are enforced by Supabase as well.
 */
export async function createUploadAction(kind: UploadKind, fileName: string, contentType: string, size: number) {
  await requireAdmin();
  const rule = RULES[kind];
  if (!rule) return { error: "Unknown upload type." };
  if (!rule.types.includes(contentType)) return { error: `Unsupported file type. Allowed: ${rule.types.map((t) => t.split("/")[1]).join(", ")}.` };
  if (!(size > 0) || size > rule.maxBytes) return { error: `File is too large (max ${Math.round(rule.maxBytes / 1024 / 1024)} MB).` };

  const path = `${kind}/${randomUUID()}-${safeName(fileName)}`;
  const { data, error } = await serviceDb().storage.from(rule.bucket).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("upload url:", error?.message);
    return { error: "Could not start the upload. Please try again." };
  }
  const publicUrl = rule.bucket === "public-media" ? serviceDb().storage.from(rule.bucket).getPublicUrl(path).data.publicUrl : undefined;
  return { bucket: rule.bucket, path: data.path, token: data.token, publicUrl };
}

/** Step 2 for eBooks: link the uploaded private file to its product (replacing any previous file). */
export async function attachProductFileAction(productId: string, path: string, fileName: string, size: number, mimeType: string) {
  await requireAdmin();
  if (!path.startsWith("ebook/") || path.includes("..")) return { error: "Invalid file path." };
  if (!RULES.ebook.types.includes(mimeType)) return { error: "Unsupported file type." };

  const db = await sessionDb(); // RLS: admin only
  const { data: previous } = await db.from("product_files").select("path").eq("product_id", productId).maybeSingle();
  const { error } = await db
    .from("product_files")
    .upsert({ product_id: productId, path, file_name: fileName.slice(0, 200), size_bytes: size, mime_type: mimeType, uploaded_at: new Date().toISOString() });
  if (error) {
    console.error("attach file:", error.message);
    return { error: "Could not save the file record." };
  }
  if (previous?.path && previous.path !== path) await serviceDb().storage.from("ebook-files").remove([previous.path]);
  updateTag(PRODUCTS_TAG);
  return {};
}

export async function removeProductFileAction(productId: string) {
  await requireAdmin();
  const db = await sessionDb();
  const { data: current } = await db.from("product_files").select("path").eq("product_id", productId).maybeSingle();
  if (!current) return {};
  await db.from("product_files").delete().eq("product_id", productId);
  await serviceDb().storage.from("ebook-files").remove([current.path]);
  return {};
}
