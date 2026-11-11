import { connection } from "next/server";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CategoryManager } from "@/components/admin/category-manager";
import { LoadingIndicator } from "@/components/ui/states";
import { categoryUsage, listAllCategories } from "@/lib/categories/store";

export const metadata = { title: "Categories" };

export default function AdminCategoriesPage() {
  return (
    <>
      <AdminPageHeader
        title="Categories"
        description="Shared by books and articles. Rename, describe and reorder freely; a category can be deleted once nothing uses it."
      />
      <Suspense fallback={<LoadingIndicator label="Loading categories" />}>
        <Categories />
      </Suspense>
    </>
  );
}

async function Categories() {
  await connection(); // admin data is always read at request time
  const [categories, usage] = await Promise.all([listAllCategories(), categoryUsage()]);
  const rows = categories.map((c) => ({ ...c, books: usage[c.slug]?.books ?? 0, articles: usage[c.slug]?.articles ?? 0 }));
  return <CategoryManager rows={rows} />;
}
