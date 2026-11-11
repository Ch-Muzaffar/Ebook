import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EbookFileManager } from "@/components/admin/ebook-file-manager";
import { ProductForm } from "@/components/admin/product-form";
import { LoadingIndicator } from "@/components/ui/states";
import { updateProductAction } from "@/lib/catalog/actions";
import { getProductFile } from "@/lib/catalog/product-store";
import { getProductForAdmin } from "@/lib/catalog/queries";
import { formValuesFromProduct } from "@/lib/catalog/validation";

export const metadata = { title: "Edit book" };

export default function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<LoadingIndicator label="Loading book" />}>
      <EditProduct params={params} />
    </Suspense>
  );
}

async function EditProduct({ params }: { params: PageProps<"/admin/products/[id]">["params"] }) {
  const { id } = await params;
  const product = await getProductForAdmin(id);
  if (!product) notFound();
  const file = await getProductFile(product.id);

  return (
    <>
      <AdminPageHeader
        title={`Edit: ${product.title}`}
        description={`Last updated ${new Date(product.updatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC`}
      />
      <div className="flex flex-col gap-10">
        <EbookFileManager productId={product.id} file={file} />
        <ProductForm action={updateProductAction.bind(null, product.id)} initial={formValuesFromProduct(product)} mode="edit" />
      </div>
    </>
  );
}
