-- Abandoned cart snapshots + funnel events for admin recovery / drop-off analytics.

create table if not exists public.cart_sessions (
  id uuid primary key default gen_random_uuid(),
  guest_key text,
  user_id uuid references auth.users (id) on delete set null,
  email text not null default '',
  company_name text not null default '',
  contact_name text not null default '',
  phone text not null default '',
  shipping_zip text not null default '',
  shipping_city text not null default '',
  shipping_state text not null default '',
  items jsonb not null default '[]'::jsonb,
  item_count integer not null default 0,
  subtotal_usd numeric(12, 2) not null default 0,
  total_pallets numeric(10, 4) not null default 0,
  status text not null default 'active'
    check (status in ('active', 'abandoned', 'converted')),
  last_activity_at timestamptz not null default now(),
  abandoned_at timestamptz,
  converted_at timestamptz,
  converted_order_id text,
  checkout_started_at timestamptz,
  credit_auth_prompted_at timestamptz,
  source text not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cart_sessions_status_activity_idx
  on public.cart_sessions (status, last_activity_at desc);

create index if not exists cart_sessions_user_id_idx
  on public.cart_sessions (user_id)
  where user_id is not null;

create index if not exists cart_sessions_guest_key_idx
  on public.cart_sessions (guest_key)
  where guest_key is not null;

create index if not exists cart_sessions_email_idx
  on public.cart_sessions (lower(email))
  where email <> '';

-- One active cart per authenticated user / guest key.
create unique index if not exists cart_sessions_active_user_uidx
  on public.cart_sessions (user_id)
  where status = 'active' and user_id is not null;

create unique index if not exists cart_sessions_active_guest_uidx
  on public.cart_sessions (guest_key)
  where status = 'active' and guest_key is not null;

create table if not exists public.cart_funnel_events (
  id uuid primary key default gen_random_uuid(),
  cart_session_id uuid references public.cart_sessions (id) on delete set null,
  guest_key text,
  user_id uuid references auth.users (id) on delete set null,
  event_name text not null
    check (event_name in (
      'add_to_cart',
      'checkout_started',
      'credit_auth_prompted',
      'order_completed'
    )),
  pallet_count numeric(10, 4) not null default 0,
  cart_value_usd numeric(12, 2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cart_funnel_events_name_created_idx
  on public.cart_funnel_events (event_name, created_at desc);

create index if not exists cart_funnel_events_session_idx
  on public.cart_funnel_events (cart_session_id);

alter table public.cart_sessions enable row level security;
alter table public.cart_funnel_events enable row level security;

drop policy if exists "Admins manage cart sessions" on public.cart_sessions;
create policy "Admins manage cart sessions"
  on public.cart_sessions
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

drop policy if exists "Admins read cart funnel events" on public.cart_funnel_events;
create policy "Admins read cart funnel events"
  on public.cart_funnel_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Users may not read/write via RLS; app uses service role for sync/upsert.
