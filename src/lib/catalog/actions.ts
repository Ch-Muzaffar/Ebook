"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";
import { listAllCategories } from "@/lib/categories/store";
import type { ProductStatus } from "@/lib/content/types";
import * as store from "./product-store";
import { PRODUCTS_TAG } from "./queries";
import { formValuesFromProduct, parseProductForm, type ProductFormState } from "./validation";

const friendly = (e: unknown) =>
  e instanceof Error && /duplicate key|products_slug_key/.test(e.message) ? "Another book already uses this URL slug." : "Could not save. Please try again.";

export async function createProductAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();
  const parsed = parseProductForm(formData, await store.listAllProducts(), await listAllCategories());
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values };
  try {
    await store.insertProduct(parsed.data);
  } catch (e) {
    console.error(e);
    return { errors: { form: friendly(e) }, values: formValuesFromProduct({ ...parsed.data, id: "", updatedAt: "" }) };
  }
  updateTag(PRODUCTS_TAG);
  redirect("/admin/products?saved=created");
}

export async function updateProductAction(id: string, _prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();
  const parsed = parseProductForm(formData, await store.listAllProducts(), await listAllCategories(), id);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values };
  try {
    await store.updateProduct(id, parsed.data);
  } catch (e) {
    console.error(e);
    return { errors: { form: friendly(e) }, values: formValuesFromProduct({ ...parsed.data, id, updatedAt: "" }) };
  }
  updateTag(PRODUCTS_TAG);
  redirect("/admin/products?saved=updated");
}

export async function setProductStatusAction(id: string, status: ProductStatus) {
  await requireAdmin();
  const current = await store.findProduct(id);
  if (!current) throw new Error("Product not found");
  const publishedAt = status === "published" ? (current.publishedAt ?? new Date().toISOString().slice(0, 10)) : current.publishedAt;
  await store.setProductStatus(id, status, publishedAt);
  updateTag(PRODUCTS_TAG);
}

export async function deleteProductAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await store.deleteProduct(id);
  } catch (e) {
    // The database refuses to delete a book that customers have bought (their access must survive).
    if (e instanceof Error && /foreign key|downloads_product_id_fkey/.test(e.message))
      return { error: "Customers have bought this book, so it can't be deleted. Unpublish it instead — buyers keep their access." };
    throw e;
  }
  updateTag(PRODUCTS_TAG);
  return {};
}
