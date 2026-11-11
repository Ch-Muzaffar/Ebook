-- =============================================================================
-- 0003_orders — orders, items, download entitlements, payment event log (PRD §8, §12.2)
-- All writes happen on the server (service role) from the checkout action and from
-- signature-verified payment webhooks. Customers can only READ their own records.
-- =============================================================================

create table public.orders (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete restrict,
  email                text not null,
  status               text not null default 'pending'
                         check (status in ('pending', 'paid', 'refunded', 'partially_refunded', 'failed', 'cancelled')),
  currency             text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  subtotal_cents       integer not null check (subtotal_cents >= 0),  -- what WE priced (server-side)
  tax_cents            integer,                                       -- from the provider, once paid
  total_cents          integer,                                       -- charged total incl. tax, once paid
  provider             text not null default 'lemonsqueezy',
  provider_checkout_id text,
  provider_order_id    text unique,
  provider_order_number integer,
  receipt_url          text,
  test_mode            boolean not null default true,
  created_at           timestamptz not null default now(),
  paid_at              timestamptz,
  refunded_at          timestamptz,
  updated_at           timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  product_id  uuid references public.products (id) on delete set null,
  title       text not null,          -- snapshot at purchase time
  price_cents integer not null check (price_cents >= 0)
);
create index order_items_order_idx on public.order_items (order_id);

-- Download entitlement: one row per (customer, book). Revoked on refund.
create table public.downloads (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  product_id         uuid not null references public.products (id) on delete cascade,
  order_id           uuid not null references public.orders (id) on delete cascade,
  granted_at         timestamptz not null default now(),
  revoked_at         timestamptz,
  download_count     integer not null default 0,
  last_downloaded_at timestamptz,
  unique (user_id, product_id)
);
create index downloads_order_idx on public.downloads (order_id);

-- Every received webhook (verified or not) for audit + idempotency.
create table public.payment_events (
  id            text primary key,              -- sha256 of the raw body
  provider      text not null default 'lemonsqueezy',
  event_name    text not null,
  order_id      uuid references public.orders (id) on delete set null,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  outcome       text                            -- e.g. 'paid', 'ignored: …', 'rejected: …'
);
create index payment_events_order_idx on public.payment_events (order_id, received_at);

-- ---------------------------------------------------------------- RLS
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.downloads enable row level security;
alter table public.payment_events enable row level security;

create policy "orders: read own or admin" on public.orders for select
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "order_items: read own or admin" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = (select auth.uid()) or (select public.is_admin()))));
create policy "downloads: read own or admin" on public.downloads for select
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "payment_events: admin read" on public.payment_events for select
  using ((select public.is_admin()));

-- No insert/update/delete policies: only the server (service role) can write these tables.
revoke insert, update, delete on public.orders, public.order_items, public.downloads, public.payment_events from anon, authenticated;
