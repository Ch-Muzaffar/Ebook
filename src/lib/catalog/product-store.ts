import "server-only";

import type { Product } from "@/lib/content/types";
import { fromProduct, must, PRODUCT_COLUMNS, toProduct } from "@/lib/supabase/mappers";
import { sessionDb } from "@/lib/supabase/server";

/**
 * Admin product storage (Supabase). Uses the signed-in user's session, so Row Level Security
 * independently requires the admin role for every read of drafts and every write.
 */
export type ProductInput = Omit<Product, "id" | "updatedAt">;

export async function listAllProducts(): Promise<Product[]> {
  const db = await sessionDb();
  const rows = must(await db.from("products").select(PRODUCT_COLUMNS).order("updated_at", { ascending: false }), "list products");
  return rows.map(toProduct);
}

export async function findProduct(id: string): Promise<Product | undefined> {
  const db = await sessionDb();
  const row = must(await db.from("products").select(PRODUCT_COLUMNS).eq("id", id).maybeSingle(), "get product");
  return row ? toProduct(row) : undefined;
}

export async function getProductFile(productId: string) {
  const db = await sessionDb();
  const { data } = await db.from("product_files").select("file_name, size_bytes, uploaded_at").eq("product_id", productId).maybeSingle();
  return data ? { fileName: data.file_name as string, sizeBytes: Number(data.size_bytes), uploadedAt: data.uploaded_at as string } : null;
}

export async function insertProduct(input: ProductInput): Promise<Product> {
  const db = await sessionDb();
  return toProduct(must(await db.from("products").insert(fromProduct(input)).select(PRODUCT_COLUMNS).single(), "create product"));
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  const db = await sessionDb();
  return toProduct(must(await db.from("products").update(fromProduct(input)).eq("id", id).select(PRODUCT_COLUMNS).single(), "update product"));
}

export async function setProductStatus(id: string, status: Product["status"], publishedAt?: string) {
  const db = await sessionDb();
  must(await db.from("products").update({ status, published_at: publishedAt ?? null }).eq("id", id).select("id").single(), "change status");
}

export async function deleteProduct(id: string) {
  const db = await sessionDb();
  const deleted = must(await db.from("products").delete().eq("id", id).select("id"), "delete product");
  if (!deleted.length) throw new Error("delete product: not found or not permitted");
}
