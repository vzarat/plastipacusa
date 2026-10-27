-- Pallet stock lives on public.products. The live table may have stock_qty and not stock_quantity.
-- This file adds products.stock_quantity when it is missing.
-- If stock_qty already has the pallet counts, those same numbers are copied. They are not converted.
-- A paid order subtracts items[].pallets. One loose box or a half pallet is a fraction of a pallet.
-- A line without that field counts as a full pallet only when its box count is 24, 48, or 64 boxes per package.
-- Reaching 0 pallets marks the product sold out.
-- NULL stock stays untracked.
-- Pending checkout holds stock and a limited promo code until the order is paid or released.
-- Run this whole file in the Supabase SQL editor. It is safe to run again.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'stock_quantity'
  ) then
    execute 'alter table public.products alter column stock_quantity type numeric using stock_quantity::numeric';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'stock_qty'
  ) then
    execute 'alter table public.products add column stock_quantity numeric';
    execute 'update public.products set stock_quantity = stock_qty';
  else
    execute 'alter table public.products add column stock_quantity numeric';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'stock_qty'
      and not (data_type = 'numeric' and numeric_precision is null)
  ) then
    execute 'alter table public.products alter column stock_qty type numeric using stock_qty::numeric';
  end if;
end $$;

create or replace function public.set_product_pallet_stock(
  p_product_id public.products.id%type,
  p_stock numeric,
  p_clear_sold_out boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
    set stock_quantity = p_stock,
        is_sold_out = case
          when p_stock <= 0 then true
          when p_clear_sold_out then false
          else coalesce(is_sold_out, false)
        end
    where id = p_product_id;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'stock_qty'
  ) then
    execute 'update public.products set stock_qty = $1 where id = $2'
      using p_stock, p_product_id;
  end if;
end;
$$;

alter table public.orders add column if not exists stock_hold boolean not null default false;
alter table public.orders add column if not exists coupon_hold boolean not null default false;
alter table public.orders add column if not exists stock_hold_snapshot jsonb;
alter table public.orders add column if not exists held_coupon_id uuid;

create or replace function public.release_checkout_holds(p_order_id text)
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
  v_pallets numeric;
  v_product_id public.products.id%type;
  v_on_hand numeric;
begin
  v_id := p_order_id;
  select * into ord from public.orders where id = v_id for update;
  if not found then
    return;
  end if;
  if ord.inventory_settled or ord.payment_status = 'Paid & Cleared' or ord.status is distinct from 'pending_payment' then
    return;
  end if;

  if ord.stock_hold and jsonb_typeof(ord.stock_hold_snapshot) = 'array' then
    for v_line in
      select value
      from jsonb_array_elements(ord.stock_hold_snapshot) as value
      order by value->>'sku'
    loop
      v_sku := v_line->>'sku';
      v_pallets := round(coalesce((v_line->>'pallets')::numeric, 0), 6);
      if v_sku is null or btrim(v_sku) = '' or v_pallets <= 0 then
        continue;
      end if;
      v_product_id := null;
      v_on_hand := null;
      select v.product_id into v_product_id
        from public.product_variants v
        where v.sku = v_sku
        limit 1;
      if v_product_id is null then
        continue;
      end if;
      select p.stock_quantity into v_on_hand
        from public.products p
        where p.id = v_product_id
        for update;
      if v_on_hand is null then
        continue;
      end if;
      perform public.set_product_pallet_stock(
        v_product_id,
        v_on_hand + v_pallets,
        v_on_hand <= 0 and v_on_hand + v_pallets > 0
      );
    end loop;
  end if;

  if ord.coupon_hold and ord.held_coupon_id is not null then
    update public.coupons
      set used_count = greatest(coalesce(used_count, 0) - 1, 0)
      where id = ord.held_coupon_id;
  end if;

  update public.orders
    set stock_hold = false,
        stock_hold_snapshot = null,
        coupon_hold = false,
        held_coupon_id = null
    where id = v_id;
end;
$$;

create or replace function public.sync_checkout_holds(p_order_id text)
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
  v_name text;
  v_pallets numeric;
  v_quantity integer;
  v_boxes integer;
  v_product_id public.products.id%type;
  v_on_hand numeric;
  v_sold boolean;
  v_snapshot jsonb := '[]'::jsonb;
  v_need jsonb := '{}'::jsonb;
  v_coupon public.coupons%rowtype;
begin
  v_id := p_order_id;
  perform public.release_checkout_holds(p_order_id);
  select * into ord from public.orders where id = v_id for update;
  if not found then
    raise exception 'order not found';
  end if;
  if ord.status is distinct from 'pending_payment' then
    return;
  end if;

    if jsonb_typeof(ord.items) = 'array' then
      for v_line in select * from jsonb_array_elements(ord.items)
    loop
      v_sku := btrim(coalesce(v_line->>'sku', ''));
      v_name := coalesce(nullif(btrim(v_line->>'productName'), ''), v_sku);
      v_pallets := null;
      if v_line ? 'pallets' and btrim(v_line->>'pallets') <> '' then
        v_pallets := round((v_line->>'pallets')::numeric, 6);
      else
        v_quantity := greatest(coalesce((v_line->>'quantity')::integer, 1), 1);
        v_boxes := coalesce((v_line->>'boxes')::integer, 0);
        if v_boxes > 0 and v_quantity > 0 and v_boxes % v_quantity = 0
           and (v_boxes / v_quantity) in (24, 48, 64) then
          v_pallets := v_quantity;
        else
          v_pallets := 0;
        end if;
      end if;
      if v_sku = '' or v_pallets is null or v_pallets <= 0 then
        continue;
      end if;
      v_need := v_need || jsonb_build_object(
        v_sku,
        jsonb_build_object(
          'pallets', round(coalesce((v_need -> v_sku ->> 'pallets')::numeric, 0) + v_pallets, 6),
          'name', v_name
        )
      );
    end loop;

    for v_sku in
      select t.key
      from jsonb_object_keys(v_need) as t(key)
      order by t.key
    loop
      v_pallets := round((v_need -> v_sku ->> 'pallets')::numeric, 6);
      v_name := coalesce(v_need -> v_sku ->> 'name', v_sku);
      v_product_id := null;
      select v.product_id into v_product_id
        from public.product_variants v
        where v.sku = v_sku
        limit 1;
      if v_product_id is null then
        raise exception '% is sold out.', v_name;
      end if;
      v_on_hand := null;
      v_sold := false;
      select p.stock_quantity, coalesce(p.is_sold_out, false)
        into v_on_hand, v_sold
        from public.products p
        where p.id = v_product_id
        for update;
      if not found or v_product_id is null then
        raise exception '% is sold out.', v_name;
      end if;
      if v_sold then
        raise exception '% is sold out.', v_name;
      end if;
      if v_on_hand is null then
        continue;
      end if;
      if v_on_hand <= 0 then
        raise exception '% is sold out.', v_name;
      end if;
      if v_on_hand < v_pallets then
        if v_on_hand = trunc(v_on_hand) and v_on_hand = 1 then
          raise exception 'Only 1 full pallet is available for %.', v_name;
        elsif v_on_hand = trunc(v_on_hand) then
          raise exception 'Only % full pallets are available for %.', trunc(v_on_hand)::integer, v_name;
        else
          raise exception 'Only % pallets are available for %.', trim(to_char(v_on_hand, 'FM999990.9999')), v_name;
        end if;
      end if;
      perform public.set_product_pallet_stock(v_product_id, v_on_hand - v_pallets, false);
      v_snapshot := v_snapshot || jsonb_build_array(
        jsonb_build_object('sku', v_sku, 'pallets', v_pallets)
      );
    end loop;
  end if;

  if ord.coupon_id is not null then
    select * into v_coupon from public.coupons where id = ord.coupon_id for update;
    if not found or coalesce(v_coupon.is_active, false) = false then
      raise exception 'This promo code is inactive.';
    end if;
    if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
      raise exception 'This promo code has expired.';
    end if;
    if v_coupon.max_uses is not null and coalesce(v_coupon.used_count, 0) >= v_coupon.max_uses then
      raise exception 'This promo code has reached its usage limit.';
    end if;
    update public.coupons
      set used_count = coalesce(used_count, 0) + 1
      where id = ord.coupon_id;
  end if;

  update public.orders
    set stock_hold = true,
        stock_hold_snapshot = v_snapshot,
        coupon_hold = ord.coupon_id is not null,
        held_coupon_id = ord.coupon_id
    where id = v_id;
end;
$$;

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
  v_quantity integer;
  v_pallets numeric;
  v_product_id public.products.id%type;
  v_on_hand numeric;
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

  -- A checkout hold already subtracted pallets. NULL stock_quantity is untracked.
  if not ord.inventory_settled then
    if not coalesce(ord.stock_hold, false) and jsonb_typeof(ord.items) = 'array' then
      for v_line in select * from jsonb_array_elements(ord.items)
      loop
        v_sku := v_line->>'sku';
        v_pallets := null;
        if v_line ? 'pallets' and btrim(v_line->>'pallets') <> '' then
          v_pallets := round((v_line->>'pallets')::numeric, 6);
        else
          v_quantity := greatest(coalesce((v_line->>'quantity')::integer, 1), 1);
          v_boxes := coalesce((v_line->>'boxes')::integer, 0);
          if v_boxes > 0 and v_quantity > 0 and v_boxes % v_quantity = 0
             and (v_boxes / v_quantity) in (24, 48, 64) then
            v_pallets := v_quantity;
          else
            v_pallets := 0;
          end if;
        end if;
        if v_pallets is null or v_pallets < 0 then
          raise exception 'Order line % has an invalid pallet count', coalesce(v_sku, '?');
        end if;
        if v_pallets = 0 then
          continue;
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
        if v_on_hand is null then
          continue;
        end if;
        if v_on_hand < v_pallets then
          v_short := v_short
            || 'Insufficient stock for ' || v_sku
            || ': need ' || trim(to_char(v_pallets, 'FM999990.9999'))
            || ' pallets, on hand ' || trim(to_char(v_on_hand, 'FM999990.9999')) || '. ';
          continue;
        end if;
        perform public.set_product_pallet_stock(v_product_id, v_on_hand - v_pallets, false);
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
    if not coalesce(ord.coupon_hold, false) and ord.coupon_id is not null then
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

do $$
declare
  sig text;
begin
  select pg_get_function_identity_arguments(p.oid)
    into sig
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'set_product_pallet_stock';
  execute format('revoke all on function public.set_product_pallet_stock(%s) from public', sig);
  execute format('revoke all on function public.set_product_pallet_stock(%s) from anon', sig);
  execute format('revoke all on function public.set_product_pallet_stock(%s) from authenticated', sig);
  execute format('grant execute on function public.set_product_pallet_stock(%s) to service_role', sig);
end $$;

revoke all on function public.release_checkout_holds(text) from public;
revoke all on function public.release_checkout_holds(text) from anon;
revoke all on function public.release_checkout_holds(text) from authenticated;
grant execute on function public.release_checkout_holds(text) to service_role;

revoke all on function public.sync_checkout_holds(text) from public;
revoke all on function public.sync_checkout_holds(text) from anon;
revoke all on function public.sync_checkout_holds(text) from authenticated;
grant execute on function public.sync_checkout_holds(text) to service_role;

revoke all on function public.settle_paid_order(text) from public;
revoke all on function public.settle_paid_order(text) from anon;
revoke all on function public.settle_paid_order(text) from authenticated;
grant execute on function public.settle_paid_order(text) to service_role;

comment on function public.settle_paid_order(text) is
  'Marks the order paid. products.stock_quantity is full pallets, including fractions of a pallet. A checkout hold is not subtracted again. NULL stock_quantity is untracked. A shortage keeps status paid and sets payment_review. Stock of 0 sets is_sold_out.';

comment on function public.sync_checkout_holds(text) is
  'Reserves pallet stock and one promo use for a pending order. Replaces any hold already on that order.';

comment on function public.release_checkout_holds(text) is
  'Returns a pending order hold to pallet stock and promo availability.';
