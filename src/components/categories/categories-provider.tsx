"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Category } from "@/lib/categories/types";

const CategoriesContext = createContext<Category[]>([]);

/** Makes the (cached) category list available to client components such as cards and filters. */
export function CategoriesProvider({ categories, children }: { categories: Category[]; children: ReactNode }) {
  return <CategoriesContext.Provider value={categories}>{children}</CategoriesContext.Provider>;
}

export function useCategories() {
  return useContext(CategoriesContext);
}

/** Renders a category's display name from its slug (falls back to the slug). */
export function CategoryName({ slug }: { slug: string }) {
  const name = useContext(CategoriesContext).find((c) => c.slug === slug)?.name;
  return <>{name ?? slug}</>;
}
