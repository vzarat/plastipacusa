-- Run in Supabase. Not applied by the app.
--
-- products.stock_quantity is in boxes.
-- Each order line stores boxes = catalog boxes_count × quantity.
-- Settlement subtracts that boxes value. A missing boxes count fails the settlement.

alter table public.orders
  add column if not exists booking_status text not null default 'needs_booking';

alter table public.orders
  drop constraint if exists orders_booking_status_check;

alter table public.orders
  add constraint orders_booking_status_check
  check (booking_status in ('needs_booking', 'booked', 'booking_failed'));

alter table public.orders
  add column if not exists payment_attempt integer not null default 1;

alter table public.orders
  add column if not exists payment_review boolean not null default false;

alter table public.orders
  add column if not exists coupon_id uuid;

alter table public.orders
  add column if not exists payment_review_reason text;

alter table public.orders
  add column if not exists amount_expected_cents integer;

alter table public.orders
  add column if not exists amount_received_cents integer;

alter table public.orders
  add column if not exists inventory_settled boolean not null default false;

alter table public.orders
  add column if not exists coupon_settled boolean not null default false;

alter table public.orders
  add column if not exists confirmation_sent_at timestamptz;

alter table public.orders
  add column if not exists fulfillment_status text;

create unique index if not exists orders_one_pending_payment_per_user
  on public.orders (user_id)
  where status = 'pending_payment';

create unique index if not exists orders_payment_intent_id_uidx
  on public.orders (payment_intent_id)
  where payment_intent_id is not null;

-- An unmatched PaymentIntent has no customer. user_id stays null on that review row.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'user_id'
      and is_nullable = 'NO'
  ) then
    alter table public.orders alter column user_id drop not null;
  end if;
end;
$$;

-- This repo does not create orders policies. A customer policy USING (user_id = auth.uid())
-- hides a null user_id, because NULL = auth.uid() is not true. App order lists also
-- filter on the signed-in user id, so the unmatched review row is not returned to a customer.
do $$
declare
  v_rls boolean;
  v_policy text;
begin
  select c.relrowsecurity into v_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'orders';

  select string_agg(
    pol.polname || ' ' || coalesce(pg_get_expr(pol.polqual, pol.polrelid), '(no using)'),
    E'\n'
  )
  into v_policy
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'orders'
    and pol.polcmd in ('r', '*');

  if coalesce(v_rls, false) and v_policy is not null and v_policy !~* 'user_id' then
    raise exception 'orders SELECT policy does not restrict user_id, so a null user_id would be visible: %', v_policy;
  end if;
end;
$$;

-- Widen a status CHECK if the live table has one. This repo does not define an enum.
do $$
declare
  r record;
  v_expr text;
  v_type text;
  v_kind "char";
begin
  select t.typname, t.typtype
    into v_type, v_kind
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_type t on t.oid = a.atttypid
  where n.nspname = 'public'
    and c.relname = 'orders'
    and a.attname = 'status'
    and a.attnum > 0
    and not a.attisdropped;

  if v_kind = 'e' then
    execute format(
      'alter type public.%I add value if not exists %L',
      v_type,
      'pending_payment'
    );
    execute format(
      'alter type public.%I add value if not exists %L',
      v_type,
      'payment_review'
    );
  end if;

  for r in
    select c.conname, pg_get_constraintdef(c.oid) as def
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'orders'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ~* '\mstatus\M'
  loop
    if r.def ilike '%pending_payment%' and r.def ilike '%payment_review%' then
      continue;
    end if;
    v_expr := regexp_replace(r.def, '^CHECK\s*\((.*)\)\s*$', '\1');
    execute format('alter table public.orders drop constraint %I', r.conname);
    execute format(
      'alter table public.orders add constraint %I check ((status in (%L, %L)) or (%s))',
      r.conname,
      'pending_payment',
      'payment_review',
      v_expr
    );
  end loop;
end;
$$;

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

revoke all on table public.stripe_webhook_events from anon;
revoke all on table public.stripe_webhook_events from authenticated;

comment on table public.stripe_webhook_events is
  'Server-only Stripe event ids. No public policies; the service role bypasses RLS.';

-- One transaction: mark paid, decrement stock, and count the coupon.
-- Each effect checks a flag on the order so a retry cannot apply it twice.
create or replace function public.settle_paid_order(p_order_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.orders%rowtype;
  v_id public.orders.id%type;
  v_line jsonb;
  v_sku text;
  v_boxes integer;
  v_product_id public.products.id%type;
  v_on_hand integer;
  v_short text := '';
begin
  v_id := p_order_id;
  select * into ord from public.orders where id = v_id for update;
  if not found then
    raise exception 'order not found';
  end if;

  if ord.payment_status is distinct from 'Paid & Cleared' or not ord.inventory_settled then
    update public.orders
      set status = 'paid',
          payment_status = 'Paid & Cleared',
          booking_status = 'needs_booking',
          fulfillment_status = 'unfulfilled',
          payment_review = case when ord.inventory_settled then payment_review else false end,
          payment_review_reason = case when ord.inventory_settled then payment_review_reason else null end
      where id = v_id;
  end if;

  -- products.stock_quantity is in boxes. v_boxes is the line's catalog boxes_count × quantity.
  -- NULL stock_quantity means the product is untracked: it is not decremented and it is not a shortage.
  if not ord.inventory_settled then
    if jsonb_typeof(ord.items) = 'array' then
      for v_line in select * from jsonb_array_elements(ord.items)
      loop
        v_sku := v_line->>'sku';
        if v_line->>'boxes' is null or btrim(v_line->>'boxes') = '' then
          raise exception 'Order line % has no boxes', coalesce(v_sku, '?');
        end if;
        v_boxes := (v_line->>'boxes')::integer;
        if v_boxes is null or v_boxes < 1 then
          raise exception 'Order line % has no boxes', coalesce(v_sku, '?');
        end if;
        if v_sku is null or btrim(v_sku) = '' then
          v_short := v_short || 'Unknown sku on an order line. ';
          continue;
        end if;
        v_product_id := null;
        select v.product_id into v_product_id
          from public.product_variants v
          where v.sku = v_sku
          limit 1;
        if not found or v_product_id is null then
          v_short := v_short || 'Unknown sku ' || v_sku || '. ';
          continue;
        end if;
        v_on_hand := null;
        select p.stock_quantity into v_on_hand
          from public.products p
          where p.id = v_product_id
          for update;
        if not found then
          v_short := v_short || 'Unknown product for sku ' || v_sku || '. ';
          continue;
        end if;
        -- NULL stock_quantity is untracked. Leave it null and do not flag a shortage.
        if v_on_hand is null then
          continue;
        end if;
        if v_on_hand < v_boxes then
          v_short := v_short
            || 'Insufficient stock for ' || v_sku
            || ': need ' || v_boxes || ' boxes, on hand ' || v_on_hand || '. ';
          continue;
        end if;
        update public.products
          set stock_quantity = v_on_hand - v_boxes
          where id = v_product_id;
      end loop;
    end if;
    if v_short <> '' then
      update public.orders
        set payment_review = true,
            payment_review_reason = v_short
        where id = v_id;
    end if;
    update public.orders set inventory_settled = true where id = v_id;
  end if;

  if not ord.coupon_settled then
    if ord.coupon_id is not null then
      update public.coupons
        set used_count = coalesce(used_count, 0) + 1
        where id = ord.coupon_id;
    end if;
    update public.orders set coupon_settled = true where id = v_id;
  end if;
end;
$$;

revoke all on function public.settle_paid_order(text) from public;
revoke all on function public.settle_paid_order(text) from anon;
revoke all on function public.settle_paid_order(text) from authenticated;
grant execute on function public.settle_paid_order(text) to service_role;

comment on function public.settle_paid_order(text) is
  'Marks the order paid. products.stock_quantity is in boxes. Each line boxes value is catalog boxes_count times quantity. NULL stock_quantity is untracked and is not decremented. A shortage keeps status paid and sets payment_review.';

-- No checkout row for this PaymentIntent. Does not copy metadata line items or prices.
-- user_id is omitted. ON CONFLICT matches orders_payment_intent_id_uidx.
create or replace function public.record_unmatched_payment_intent(
  p_payment_intent_id text,
  p_amount_received_cents integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cols text := 'status, payment_status, payment_review, payment_review_reason, payment_intent_id, amount_received_cents, amount_expected_cents, booking_status, fulfillment_status, items, total, total_amount, shipping_address';
  v_vals text;
  col record;
begin
  v_vals := format(
    '%L, %L, true, %L, %L, %s, null, %L, %L, %L::jsonb, 0, 0, %L::jsonb',
    'payment_review',
    'pending',
    'No order was stored for this PaymentIntent.',
    p_payment_intent_id,
    coalesce(p_amount_received_cents, 0),
    'needs_booking',
    'unfulfilled',
    '[]',
    '{}'
  );

  -- Any other NOT NULL column without a default gets a typed placeholder.
  -- user_id is not one of them: the migration drops that requirement above.
  for col in
    select column_name, data_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and is_nullable = 'NO'
      and column_default is null
      and coalesce(is_identity, 'NO') = 'NO'
      and coalesce(is_generated, 'NEVER') = 'NEVER'
      and column_name not in (
        'status', 'payment_status', 'payment_review', 'payment_review_reason',
        'payment_intent_id', 'amount_received_cents', 'amount_expected_cents',
        'booking_status', 'fulfillment_status', 'items', 'total', 'total_amount',
        'shipping_address'
      )
  loop
    v_cols := v_cols || ', ' || quote_ident(col.column_name);
    v_vals := v_vals || ', ' || case
      when col.data_type in ('text', 'character varying', 'character') then quote_literal('')
      when col.data_type in ('integer', 'bigint', 'smallint', 'numeric', 'real', 'double precision') then '0'
      when col.data_type = 'boolean' then 'false'
      when col.data_type = 'jsonb' then quote_literal('{}') || '::jsonb'
      when col.data_type = 'json' then quote_literal('{}') || '::json'
      when col.data_type like 'timestamp%' or col.data_type = 'date' then 'now()'
      else 'null'
    end;
  end loop;

  execute format(
    'insert into public.orders (%s) values (%s) on conflict (payment_intent_id) where payment_intent_id is not null do nothing',
    v_cols,
    v_vals
  );
end;
$$;

revoke all on function public.record_unmatched_payment_intent(text, integer) from public;
revoke all on function public.record_unmatched_payment_intent(text, integer) from anon;
revoke all on function public.record_unmatched_payment_intent(text, integer) from authenticated;
grant execute on function public.record_unmatched_payment_intent(text, integer) to service_role;
