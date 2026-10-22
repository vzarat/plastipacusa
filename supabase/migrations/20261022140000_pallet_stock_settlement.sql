-- products.stock_quantity is the number of full pallets on hand.
-- A paid order subtracts items[].pallets. A line without that field counts as a full
-- pallet only when its box count is 24, 48, or 64 boxes per package.
-- Loose boxes, half pallets, and machine lines with boxes = 0 subtract nothing.
-- Reaching 0 pallets marks the product sold out.
-- NULL stock_quantity stays untracked.
-- Run this whole file in the Supabase SQL editor. Do not edit historical stock numbers.

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
  v_pallets integer;
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

  -- products.stock_quantity is full pallets. NULL is untracked and is not a shortage.
  if not ord.inventory_settled then
    if jsonb_typeof(ord.items) = 'array' then
      for v_line in select * from jsonb_array_elements(ord.items)
      loop
        v_sku := v_line->>'sku';
        v_pallets := null;
        if v_line ? 'pallets' and btrim(v_line->>'pallets') <> '' then
          v_pallets := (v_line->>'pallets')::integer;
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
            || ': need ' || v_pallets || ' pallets, on hand ' || v_on_hand || '. ';
          continue;
        end if;
        update public.products
          set stock_quantity = v_on_hand - v_pallets,
              is_sold_out = case
                when v_on_hand - v_pallets <= 0 then true
                else is_sold_out
              end
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

comment on function public.settle_paid_order(text) is
  'Marks the order paid. products.stock_quantity is full pallets. Each line pallets value is the number of full pallets. Loose boxes and half pallets subtract 0. NULL stock_quantity is untracked. A shortage keeps status paid and sets payment_review. Stock of 0 sets is_sold_out.';
