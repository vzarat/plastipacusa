-- Singleton warehouse pickup origin for Warp API (Admin Settings).
-- Run in the Supabase SQL editor. Until then, the app uses DEFAULT_WAREHOUSE_ORIGIN.

create table if not exists public.warehouse_origin (
  id uuid primary key,
  street text not null,
  city text not null,
  state text not null check (char_length(state) = 2),
  zip text not null check (zip ~ '^[0-9]{5}$'),
  dock_notes text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.warehouse_origin enable row level security;

-- Seed the real McAllen warehouse if empty.
insert into public.warehouse_origin (id, street, city, state, zip, dock_notes)
values (
  '00000000-0000-4000-8000-000000000001',
  '5801 George McVay Dr',
  'McAllen',
  'TX',
  '78503',
  ''
)
on conflict (id) do nothing;
