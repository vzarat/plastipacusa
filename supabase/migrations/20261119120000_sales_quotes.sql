-- Admin PDF sales quotes: create, email, public accept token → cart.

create table if not exists public.sales_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique,
  token text not null unique,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'viewed', 'accepted', 'expired', 'cancelled')),
  customer_user_id uuid references auth.users (id) on delete set null,
  company_name text not null default '',
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  shipping_zip text not null default '',
  shipping_city text not null default '',
  shipping_state text not null default '',
  payment_terms text not null default 'prepayment'
    check (payment_terms in ('prepayment', 'net_30')),
  valid_until timestamptz not null,
  notes text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12, 2) not null default 0,
  discount_percent numeric(6, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  shipping_amount numeric(12, 2) not null default 0,
  shipping_method text,
  shipping_quote_id text,
  tax_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  pallet_count numeric(10, 4) not null default 0,
  weight_lbs numeric(12, 2) not null default 0,
  freight_summary jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_quotes_status_created_at_idx
  on public.sales_quotes (status, created_at desc);

create index if not exists sales_quotes_email_idx
  on public.sales_quotes (lower(email));

create index if not exists sales_quotes_customer_user_id_idx
  on public.sales_quotes (customer_user_id);

create index if not exists sales_quotes_token_idx
  on public.sales_quotes (token);

alter table public.sales_quotes enable row level security;

-- Admins manage quotes via service role / authenticated admin policies.
drop policy if exists "Admins manage sales quotes" on public.sales_quotes;
create policy "Admins manage sales quotes"
  on public.sales_quotes
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Public may read a single quote by token through the accept page (anon).
drop policy if exists "Public read sales quote by token" on public.sales_quotes;
create policy "Public read sales quote by token"
  on public.sales_quotes
  for select
  to anon, authenticated
  using (
    status in ('sent', 'viewed', 'accepted')
    and valid_until > now()
  );
