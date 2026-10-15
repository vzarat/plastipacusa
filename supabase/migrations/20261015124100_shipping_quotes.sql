-- Run in Supabase. Not applied by the app.

create table if not exists public.shipping_quotes (
  quote_id text primary key,
  carrier_name text,
  carrier_key text,
  service_level text,
  service_name text not null,
  description text not null,
  shipping_mode text not null,
  price_cents integer not null check (price_cents >= 0),
  destination_zip text not null,
  weight_lbs numeric not null,
  pallet_count integer not null,
  transit_days integer not null,
  items_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists shipping_quotes_expires_at_idx
  on public.shipping_quotes (expires_at);

alter table public.shipping_quotes enable row level security;

revoke all on table public.shipping_quotes from anon;
revoke all on table public.shipping_quotes from authenticated;

comment on table public.shipping_quotes is
  'Server-only Warp quote cache. No public policies; the service role bypasses RLS.';
