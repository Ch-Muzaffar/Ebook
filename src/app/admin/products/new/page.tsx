import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductForm } from "@/components/admin/product-form";
import { createProductAction } from "@/lib/catalog/actions";
import { formValuesFromProduct } from "@/lib/catalog/validation";

export const metadata = { title: "New book" };

export default function NewProductPage() {
  return (
    <>
      <AdminPageHeader title="New book" description="New books start as drafts unless you publish them." />
      <ProductForm action={createProductAction} initial={formValuesFromProduct()} mode="create" />
    </>
  );
}
