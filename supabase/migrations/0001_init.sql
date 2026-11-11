-- =============================================================================
-- 0001_init — core schema, roles, Row Level Security, storage (PRD §12.2, §12.3)
-- Applied by scripts/db/migrate.mjs (tracked in app_private.migrations).
-- =============================================================================

-- Private schema: never exposed through the Supabase API.
create schema if not exists app_private;

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- profiles & roles
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- True when the signed-in user is an admin. SECURITY DEFINER so policies can call it
-- without recursive RLS checks on profiles.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

-- Every new auth user gets a profile (role defaults to customer).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(left(new.raw_user_meta_data ->> 'full_name', 120), ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profile email in sync if a user changes it.
create or replace function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function public.handle_user_email_change();

alter table public.profiles enable row level security;
create policy "profiles: read own or admin" on public.profiles for select
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles: update own" on public.profiles for update
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Users may only change their name — never their role or email (column privileges).
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;

-- ---------------------------------------------------------------- categories
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 200),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.categories enable row level security;
create policy "categories: public read" on public.categories for select using (true);
create policy "categories: admin insert" on public.categories for insert with check ((select public.is_admin()));
create policy "categories: admin update" on public.categories for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "categories: admin delete" on public.categories for delete using ((select public.is_admin()));

-- ---------------------------------------------------------------- products
create table public.products (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title             text not null check (char_length(title) between 1 and 120),
  subtitle          text check (char_length(subtitle) <= 160),
  author            text not null check (char_length(author) between 1 and 120),
  description       text not null check (char_length(description) between 1 and 300),
  long_description  text check (char_length(long_description) <= 10000),
  table_of_contents text[] not null default '{}',
  price_cents       integer not null check (price_cents between 0 and 9999999),
  category_slug     text not null references public.categories (slug) on update cascade on delete restrict,
  format            text not null check (char_length(format) between 1 and 40),
  pages             integer check (pages > 0),
  language          text check (char_length(language) <= 40),
  cover_image       text,
  cover_tone        text not null default 'charcoal' check (cover_tone in ('charcoal', 'gold', 'beige')),
  featured          boolean not null default false,
  status            text not null default 'draft' check (status in ('draft', 'published')),
  published_at      date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index products_status_idx on public.products (status, published_at desc);
create index products_category_idx on public.products (category_slug);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;
create policy "products: public read published" on public.products for select
  using (status = 'published' or (select public.is_admin()));
create policy "products: admin insert" on public.products for insert with check ((select public.is_admin()));
create policy "products: admin update" on public.products for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "products: admin delete" on public.products for delete using ((select public.is_admin()));

-- The downloadable eBook file for a product (object in the PRIVATE 'ebook-files' bucket).
-- Separate table so file locations are never readable by the public.
create table public.product_files (
  product_id  uuid primary key references public.products (id) on delete cascade,
  path        text not null,
  file_name   text not null,
  size_bytes  bigint not null check (size_bytes > 0),
  mime_type   text not null,
  uploaded_at timestamptz not null default now()
);
alter table public.product_files enable row level security;
create policy "product_files: admin only" on public.product_files for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------- articles
create table public.articles (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title              text not null check (char_length(title) between 1 and 150),
  excerpt            text not null check (char_length(excerpt) between 1 and 300),
  content            text not null check (char_length(content) between 1 and 100000),
  tags               text[] not null default '{}',
  featured_image     text,
  featured_image_alt text,
  author             text not null check (char_length(author) between 1 and 120),
  author_bio         text check (char_length(author_bio) <= 400),
  status             text not null default 'draft' check (status in ('draft', 'scheduled', 'published')),
  publish_at         timestamptz,
  seo_title          text check (char_length(seo_title) <= 70),
  seo_description    text check (char_length(seo_description) <= 160),
  reading_minutes    integer not null default 1 check (reading_minutes > 0),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint articles_live_needs_date check (status = 'draft' or publish_at is not null)
);
create index articles_live_idx on public.articles (status, publish_at desc);
create trigger articles_updated_at before update on public.articles
  for each row execute function public.set_updated_at();

-- Live = not a draft and the publish time has passed (scheduled posts go live on their own).
create or replace function public.article_is_live(a_status text, a_publish_at timestamptz) returns boolean
language sql stable set search_path = '' as $$
  select a_status <> 'draft' and a_publish_at is not null and a_publish_at <= now();
$$;

alter table public.articles enable row level security;
create policy "articles: public read live" on public.articles for select
  using (public.article_is_live(status, publish_at) or (select public.is_admin()));
create policy "articles: admin insert" on public.articles for insert with check ((select public.is_admin()));
create policy "articles: admin update" on public.articles for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "articles: admin delete" on public.articles for delete using ((select public.is_admin()));

create table public.article_categories (
  article_id    uuid not null references public.articles (id) on delete cascade,
  category_slug text not null references public.categories (slug) on update cascade on delete restrict,
  position      smallint not null default 0,
  primary key (article_id, category_slug)
);
create index article_categories_category_idx on public.article_categories (category_slug);
alter table public.article_categories enable row level security;
create policy "article_categories: read with article" on public.article_categories for select
  using (exists (select 1 from public.articles a where a.id = article_id
                 and (public.article_is_live(a.status, a.publish_at) or (select public.is_admin()))));
create policy "article_categories: admin write" on public.article_categories for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------- newsletter
-- Inserts happen only on the server (service role, validated + rate limited); no public access.
create table public.subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             text not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' and char_length(email) <= 254),
  source            text not null default 'website',
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  unsubscribed_at   timestamptz
);
create unique index subscribers_email_key on public.subscribers (lower(email));
alter table public.subscribers enable row level security;
create policy "subscribers: admin read" on public.subscribers for select using ((select public.is_admin()));
create policy "subscribers: admin delete" on public.subscribers for delete using ((select public.is_admin()));

-- ---------------------------------------------------------------- site settings (single row)
create table public.site_settings (
  id            smallint primary key default 1 check (id = 1),
  brand_name    text not null default 'The Library' check (char_length(brand_name) between 1 and 60),
  tagline       text not null default 'Ideas that inspire. Knowledge that transforms.' check (char_length(tagline) <= 120),
  description   text not null default 'Discover books and ideas designed to expand your perspective.' check (char_length(description) <= 200),
  contact_email text not null default '' check (char_length(contact_email) <= 254),
  social_links  jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict do nothing;
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();
alter table public.site_settings enable row level security;
create policy "site_settings: public read" on public.site_settings for select using (true);
create policy "site_settings: admin update" on public.site_settings for update using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------- storage
-- public-media: book covers + article images (publicly readable, admin-written)
-- ebook-files:  the paid eBook files — PRIVATE; only admins and (Phase 6) signed download links
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('public-media', 'public-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('ebook-files', 'ebook-files', false, 209715200, array['application/pdf', 'application/epub+zip'])
on conflict (id) do nothing;

create policy "public-media: admin write" on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and (select public.is_admin()));
create policy "public-media: admin update" on storage.objects for update to authenticated
  using (bucket_id = 'public-media' and (select public.is_admin()));
create policy "public-media: admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and (select public.is_admin()));
create policy "ebook-files: admin only" on storage.objects for all to authenticated
  using (bucket_id = 'ebook-files' and (select public.is_admin()))
  with check (bucket_id = 'ebook-files' and (select public.is_admin()));
