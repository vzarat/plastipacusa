-- Stock is an integer count of boxes in products.stock_boxes.
-- NULL stock_boxes is untracked. 0 is sold out.
-- boxes_per_pallet is only the display ratio (64, or 24 for compact 18" x 80 GA).
-- Existing pallet counts in stock_quantity are copied into stock_boxes only when
-- boxes_per_pallet is already set. They are not guessed.
-- Run this whole file in the Supabase SQL editor. It is safe to run again.

alter table public.products
  add column if not exists boxes_per_pallet integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_boxes_per_pallet_positive'
  ) then
    alter table public.products
      add constraint products_boxes_per_pallet_positive
      check (boxes_per_pallet is null or boxes_per_pallet > 0);
  end if;
end $$;

comment on column public.products.boxes_per_pallet is
  'Boxes in one full pallet. Used to display full pallets and loose boxes. Not a second inventory.';

alter table public.products
  add column if not exists stock_boxes integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_stock_boxes_nonnegative'
  ) then
    alter table public.products
      add constraint products_stock_boxes_nonnegative
      check (stock_boxes is null or stock_boxes >= 0);
  end if;
end $$;

comment on column public.products.stock_boxes is
  'Total boxes on hand. NULL is untracked. 0 is sold out.';

update public.products
  set stock_boxes = round(stock_quantity * boxes_per_pallet)::integer
  where stock_boxes is null
    and stock_quantity is not null
    and boxes_per_pallet is not null
    and boxes_per_pallet > 0;

create or replace function public.pallet_stock_breakdown(
  p_stock numeric,
  p_boxes_per_pallet integer
)
returns table (full_pallets integer, loose_boxes integer, total_boxes integer)
language sql
immutable
as $$
  select
    case
      when p_boxes_per_pallet is null or p_boxes_per_pallet < 1 or p_stock is null then 0
      else (round(greatest(p_stock, 0) * p_boxes_per_pallet)::integer / p_boxes_per_pallet)
    end,
    case
      when p_boxes_per_pallet is null or p_boxes_per_pallet < 1 or p_stock is null then 0
      else (round(greatest(p_stock, 0) * p_boxes_per_pallet)::integer % p_boxes_per_pallet)
    end,
    case
      when p_boxes_per_pallet is null or p_boxes_per_pallet < 1 or p_stock is null then 0
      else round(greatest(p_stock, 0) * p_boxes_per_pallet)::integer
    end;
$$;

do $$
declare
  r record;
begin
  for r in
    select pg_get_function_identity_arguments(p.oid) as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'deduct_product_boxes'
  loop
    execute format('drop function public.deduct_product_boxes(%s)', r.sig);
  end loop;
end $$;

create or replace function public.deduct_product_boxes(
  p_product_id uuid,
  p_boxes_bought integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock integer;
  v_ratio integer;
begin
  if p_boxes_bought is null or p_boxes_bought <= 0 then
    return null;
  end if;

  select p.stock_boxes, p.boxes_per_pallet
    into v_stock, v_ratio
    from public.products p
    where p.id = p_product_id
    for update;

  if not found then
    raise exception 'Product not found';
  end if;

  -- Untracked stock is not decremented.
  if v_stock is null then
    return null;
  end if;

  if v_stock < p_boxes_bought then
    raise exception 'Only % boxes available.', v_stock;
  end if;

  update public.products
    set stock_boxes = stock_boxes - p_boxes_bought,
        is_sold_out = case
          when stock_boxes - p_boxes_bought <= 0 then true
          else coalesce(is_sold_out, false)
        end
    where id = p_product_id;

  return v_stock - p_boxes_bought;
end;
$$;

create or replace function public.line_pallet_demand(p_line jsonb)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pallets numeric;
  v_quantity integer;
  v_boxes integer;
  v_ratio integer;
  v_sku text;
begin
  if p_line ? 'pallets' and btrim(coalesce(p_line->>'pallets', '')) <> '' then
    v_pallets := round((p_line->>'pallets')::numeric, 6);
    if v_pallets < 0 then
      raise exception 'Order line % has an invalid pallet count', coalesce(p_line->>'sku', '?');
    end if;
    return v_pallets;
  end if;

  v_quantity := greatest(coalesce((p_line->>'quantity')::integer, 1), 1);
  v_boxes := coalesce((p_line->>'boxes')::integer, 0);
  if v_boxes <= 0 then
    return 0;
  end if;

  v_sku := btrim(coalesce(p_line->>'sku', ''));
  if v_sku <> '' then
    select p.boxes_per_pallet into v_ratio
      from public.product_variants v
      join public.products p on p.id = v.product_id
      where v.sku = v_sku
      limit 1;
  end if;

  if v_ratio is not null and v_ratio > 0 then
    return round(v_boxes::numeric / v_ratio, 6);
  end if;

  if v_boxes % v_quantity = 0 and (v_boxes / v_quantity) in (24, 48, 64) then
    return v_quantity;
  end if;
  return 0;
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
  v_stock_boxes integer;
  v_ratio integer;
  v_need_boxes integer;
  v_total_boxes integer;
  v_full integer;
  v_loose integer;
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
      v_pallets := public.line_pallet_demand(v_line);
      v_boxes := coalesce((v_line->>'boxes')::integer, 0);
      if v_sku = '' or ((v_pallets is null or v_pallets <= 0) and v_boxes <= 0) then
        continue;
      end if;
      v_need := v_need || jsonb_build_object(
        v_sku,
        jsonb_build_object(
          'pallets', round(coalesce((v_need -> v_sku ->> 'pallets')::numeric, 0) + v_pallets, 6),
          'boxes', coalesce((v_need -> v_sku ->> 'boxes')::integer, 0) + greatest(v_boxes, 0),
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
      v_stock_boxes := null;
      select p.stock_boxes, coalesce(p.is_sold_out, false)
        into v_stock_boxes, v_sold
        from public.products p
        where p.id = v_product_id
        for update;
      if not found or v_product_id is null then
        raise exception '% is sold out.', v_name;
      end if;
      if v_stock_boxes is null then
        continue;
      end if;
      if v_sold or v_stock_boxes <= 0 then
        raise exception '% is sold out.', v_name;
      end if;
      v_need_boxes := coalesce((v_need -> v_sku ->> 'boxes')::integer, 0);
      if v_need_boxes <= 0 then
        continue;
      end if;
      perform public.deduct_product_boxes(v_product_id, v_need_boxes);
      v_snapshot := v_snapshot || jsonb_build_array(
        jsonb_build_object('sku', v_sku, 'boxes', v_need_boxes)
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
  v_stock_boxes integer;
  v_ratio integer;
  v_need_boxes integer;
  v_total_boxes integer;
  v_full integer;
  v_loose integer;
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
        v_pallets := public.line_pallet_demand(v_line);
        v_boxes := coalesce((v_line->>'boxes')::integer, 0);
        if v_pallets is null or v_pallets < 0 then
          raise exception 'Order line % has an invalid pallet count', coalesce(v_sku, '?');
        end if;
        if coalesce(v_pallets, 0) = 0 and v_boxes <= 0 then
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
        v_stock_boxes := null;
        select p.stock_boxes
          into v_stock_boxes
          from public.products p
          where p.id = v_product_id
          for update;
        if not found then
          v_short := v_short || 'Unknown product for sku ' || v_sku || '. ';
          continue;
        end if;
        if v_stock_boxes is null then
          continue;
        end if;
        v_need_boxes := greatest(coalesce(v_boxes, 0), 0);
        if v_need_boxes <= 0 then
          continue;
        end if;
        begin
          perform public.deduct_product_boxes(v_product_id, v_need_boxes);
        exception
          when raise_exception then
            v_short := v_short || sqlerrm || ' ';
        end;
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
  v_boxes integer;
  v_product_id uuid;
  v_stock integer;
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
      v_boxes := coalesce((v_line->>'boxes')::integer, 0);
      if v_sku is null or btrim(v_sku) = '' or v_boxes <= 0 then
        continue;
      end if;
      select v.product_id into v_product_id
        from public.product_variants v
        where v.sku = v_sku
        limit 1;
      if v_product_id is null then
        continue;
      end if;
      select p.stock_boxes into v_stock
        from public.products p
        where p.id = v_product_id
        for update;
      if v_stock is null then
        continue;
      end if;
      update public.products
        set stock_boxes = stock_boxes + v_boxes,
            is_sold_out = case
              when stock_boxes + v_boxes > 0 then false
              else coalesce(is_sold_out, false)
            end
        where id = v_product_id;
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

revoke all on function public.pallet_stock_breakdown(numeric, integer) from public;
revoke all on function public.pallet_stock_breakdown(numeric, integer) from anon;
revoke all on function public.pallet_stock_breakdown(numeric, integer) from authenticated;
grant execute on function public.pallet_stock_breakdown(numeric, integer) to service_role;

do $$
declare
  sig text;
begin
  select pg_get_function_identity_arguments(p.oid)
    into sig
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'deduct_product_boxes';
  execute format('revoke all on function public.deduct_product_boxes(%s) from public', sig);
  execute format('revoke all on function public.deduct_product_boxes(%s) from anon', sig);
  execute format('revoke all on function public.deduct_product_boxes(%s) from authenticated', sig);
  execute format('grant execute on function public.deduct_product_boxes(%s) to service_role', sig);
  execute format(
    'comment on function public.deduct_product_boxes(%s) is %L',
    sig,
    'Locks the product row and subtracts p_boxes_bought from stock_boxes. NULL stock_boxes is untracked.'
  );
end $$;

revoke all on function public.line_pallet_demand(jsonb) from public;
revoke all on function public.line_pallet_demand(jsonb) from anon;
revoke all on function public.line_pallet_demand(jsonb) from authenticated;
grant execute on function public.line_pallet_demand(jsonb) to service_role;

revoke all on function public.sync_checkout_holds(text) from public;
revoke all on function public.sync_checkout_holds(text) from anon;
revoke all on function public.sync_checkout_holds(text) from authenticated;
grant execute on function public.sync_checkout_holds(text) to service_role;

revoke all on function public.settle_paid_order(text) from public;
revoke all on function public.settle_paid_order(text) from anon;
revoke all on function public.settle_paid_order(text) from authenticated;
grant execute on function public.settle_paid_order(text) to service_role;
