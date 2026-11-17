-- Automatic (machine) inventory is counted in rolls, not boxes.
-- products.stock_boxes remains the storage column:
--   Manual  = boxes on hand
--   Automatic = rolls on hand
-- Checkout hold/settle now deducts rolls when line boxes are 0.

comment on column public.products.stock_boxes is
  'Inventory on hand. Manual = boxes; Automatic (machine) = rolls. NULL is untracked. 0 is sold out.';

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
  v_application text;
begin
  if p_boxes_bought is null or p_boxes_bought <= 0 then
    return null;
  end if;

  select p.stock_boxes, lower(coalesce(p.application, 'hand'))
    into v_stock, v_application
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
    if v_application = 'machine' then
      raise exception 'Only % rolls available.', v_stock;
    end if;
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
  v_boxes integer;
  v_rolls integer;
  v_units integer;
  v_product_id public.products.id%type;
  v_stock_boxes integer;
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
      v_rolls := coalesce((v_line->>'rolls')::integer, 0);
      -- Manual uses boxes; Automatic uses rolls when boxes are 0.
      v_units := case
        when v_boxes > 0 then v_boxes
        else greatest(v_rolls, 0)
      end;
      if v_sku = '' or ((v_pallets is null or v_pallets <= 0) and v_units <= 0) then
        continue;
      end if;
      v_need := v_need || jsonb_build_object(
        v_sku,
        jsonb_build_object(
          'pallets', round(coalesce((v_need -> v_sku ->> 'pallets')::numeric, 0) + coalesce(v_pallets, 0), 6),
          'units', coalesce((v_need -> v_sku ->> 'units')::integer, 0) + v_units,
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
      v_units := coalesce((v_need -> v_sku ->> 'units')::integer, 0);
      if v_units <= 0 then
        continue;
      end if;
      perform public.deduct_product_boxes(v_product_id, v_units);
      v_snapshot := v_snapshot || jsonb_build_array(
        jsonb_build_object('sku', v_sku, 'boxes', v_units)
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
  v_rolls integer;
  v_units integer;
  v_pallets numeric;
  v_product_id public.products.id%type;
  v_stock_boxes integer;
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

  -- A checkout hold already subtracted units. NULL stock_boxes is untracked.
  if not ord.inventory_settled then
    if not coalesce(ord.stock_hold, false) and jsonb_typeof(ord.items) = 'array' then
      for v_line in select * from jsonb_array_elements(ord.items)
      loop
        v_sku := v_line->>'sku';
        v_pallets := public.line_pallet_demand(v_line);
        v_boxes := coalesce((v_line->>'boxes')::integer, 0);
        v_rolls := coalesce((v_line->>'rolls')::integer, 0);
        v_units := case
          when v_boxes > 0 then v_boxes
          else greatest(v_rolls, 0)
        end;
        if v_pallets is null or v_pallets < 0 then
          raise exception 'Order line % has an invalid pallet count', coalesce(v_sku, '?');
        end if;
        if coalesce(v_pallets, 0) = 0 and v_units <= 0 then
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
        if v_units <= 0 then
          continue;
        end if;
        begin
          perform public.deduct_product_boxes(v_product_id, v_units);
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
