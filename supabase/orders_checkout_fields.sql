-- Checkout Step 4 fields stored on public.orders
-- Run in the Supabase SQL Editor

alter table public.orders
  add column if not exists shipping_address_id uuid
    references public.shipping_addresses (id) on delete set null;

alter table public.orders
  add column if not exists shipping_method text;

alter table public.orders
  add column if not exists shipping_cost numeric;

alter table public.orders
  add column if not exists tax_amount numeric;

alter table public.orders
  add column if not exists discount_amount numeric;

alter table public.orders
  add column if not exists total_amount numeric;

alter table public.orders
  add column if not exists subtotal numeric;

alter table public.orders
  add column if not exists tax_exempt_requested boolean not null default false;

create index if not exists orders_payment_intent_id_idx
  on public.orders (payment_intent_id);

create index if not exists orders_shipping_address_id_idx
  on public.orders (shipping_address_id);
