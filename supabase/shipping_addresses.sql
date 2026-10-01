-- Plastipac USA — saved checkout shipping addresses
-- Run in the Supabase SQL Editor

create table if not exists public.shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  company_name text,
  street_address text not null,
  city text not null,
  state text not null,
  postal_code text not null,
  phone text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists shipping_addresses_user_id_idx
  on public.shipping_addresses (user_id);

create unique index if not exists shipping_addresses_one_default_idx
  on public.shipping_addresses (user_id)
  where is_default;

alter table public.shipping_addresses enable row level security;

drop policy if exists "Users manage own shipping addresses" on public.shipping_addresses;
create policy "Users manage own shipping addresses"
  on public.shipping_addresses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.shipping_addresses to authenticated;
