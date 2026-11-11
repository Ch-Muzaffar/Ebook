-- A book that customers have bought must never be deleted (that would silently remove their
-- download rights). The admin can unpublish it instead; existing buyers keep access.
alter table public.downloads drop constraint downloads_product_id_fkey;
alter table public.downloads add constraint downloads_product_id_fkey
  foreign key (product_id) references public.products (id) on delete restrict;
