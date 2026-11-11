/** Shared by books and blog articles. `slug` is the stable key referenced by content and is not editable. */
export type Category = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  order: number;
};
