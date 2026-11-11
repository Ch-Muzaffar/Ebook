-- Replace an article's categories atomically (one RPC = one transaction).
-- SECURITY INVOKER: runs with the caller's rights, so RLS still requires an admin.
create or replace function public.set_article_categories(p_article_id uuid, p_slugs text[])
returns void language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.article_categories where article_id = p_article_id;
  insert into public.article_categories (article_id, category_slug, position)
  select p_article_id, s.slug, (s.ord - 1)::smallint
  from unnest(p_slugs) with ordinality as s(slug, ord);
end $$;

revoke execute on function public.set_article_categories(uuid, text[]) from anon;
