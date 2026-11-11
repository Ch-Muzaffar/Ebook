import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { getPublishedProducts } from "@/lib/catalog/queries";

export const metadata: Metadata = { title: "Shopping bag", robots: { index: false } };

export default async function CartPage() {
  const catalog = await getPublishedProducts();
  return (
    <>
      <PageHeader title="Shopping bag" />
      <Container className="py-section">
        <CartView catalog={catalog} />
      </Container>
    </>
  );
}
