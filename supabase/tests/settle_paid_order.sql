-- Run in the Supabase SQL editor after 20261022140000_pallet_stock_settlement.sql.
-- The transaction rolls back, so the fixture rows are not kept.
-- products.stock_quantity is full pallets. A half pallet stores pallets = 0.5 and deducts that share.

begin;

do $$
declare
  v_product_id public.products.id%type;
  v_coupon_id uuid;
  v_order_id public.orders.id%type;
  v_short_order_id public.orders.id%type;
  v_held_order_id public.orders.id%type;
  v_sku text;
  v_stock numeric;
  v_uses integer;
  v_status text;
  v_paid text;
  v_review boolean;
  v_sold boolean;
begin
  insert into public.products (
    slug, name, description, short_description, application, image_url, stock_quantity
  ) values (
    'settle-test-' || gen_random_uuid()::text,
    'Settle test film',
    'Settlement test product.',
    'Settlement test',
    'hand',
    'https://example.com/settle-test.png',
    5
  )
  returning id into v_product_id;

  insert into public.product_variants (
    product_id, sku, width_inches, gauge, length_feet, price_usd, price, boxes_count, rolls_count
  )
  select p.id,
    'SETTLE-' || substr(gen_random_uuid()::text, 1, 8),
    18, 80, 1500, 25.65, 25.65, 16, 64
  from public.products p
  where p.id = v_product_id
  returning sku into v_sku;

  insert into public.coupons (code, discount_percent, target_type, is_active)
  values ('SETTLE' || substr(gen_random_uuid()::text, 1, 8), 10, 'global', true)
  returning id into v_coupon_id;

  insert into public.orders (
    status, payment_status, booking_status, coupon_id, items, total, total_amount
  ) values (
    'pending_payment',
    'pending',
    'needs_booking',
    v_coupon_id,
    jsonb_build_array(
      jsonb_build_object(
        'sku', v_sku,
        'quantity', 2,
        'boxes', 128,
        'pallets', 2
      ),
      jsonb_build_object(
        'sku', v_sku,
        'quantity', 1,
        'boxes', 32,
        'pallets', 0.5
      )
    ),
    80, 80
  )
  returning id into v_order_id;

  perform public.settle_paid_order(v_order_id::text);
  perform public.settle_paid_order(v_order_id::text);

  select stock_quantity into v_stock from public.products where id = v_product_id;
  select used_count into v_uses from public.coupons where id = v_coupon_id;
  select status, payment_status into v_status, v_paid from public.orders where id = v_order_id;

  if v_stock is distinct from 2.5 then
    raise exception 'Expected stock 2.5 after subtracting 2.5 pallets twice as a no-op, got %', v_stock;
  end if;
  select is_sold_out into v_sold from public.products where id = v_product_id;
  if v_sold is distinct from false then
    raise exception 'A remaining pallet count must not force sold out';
  end if;
  if v_uses is distinct from 1 then
    raise exception 'Expected coupon used_count 1, got %', v_uses;
  end if;
  if v_paid is distinct from 'Paid & Cleared' or v_status is distinct from 'paid' then
    raise exception 'Expected paid / Paid & Cleared, got % / %', v_status, v_paid;
  end if;

  update public.products set stock_quantity = 1, is_sold_out = false where id = v_product_id;

  insert into public.orders (
    status, payment_status, booking_status, items, total, total_amount
  ) values (
    'pending_payment',
    'pending',
    'needs_booking',
    jsonb_build_array(jsonb_build_object(
      'sku', v_sku,
      'quantity', 2,
      'boxes', 128,
      'pallets', 2
    )),
    80, 80
  )
  returning id into v_short_order_id;

  perform public.settle_paid_order(v_short_order_id::text);

  select stock_quantity into v_stock from public.products where id = v_product_id;
  select status, payment_status, payment_review
    into v_status, v_paid, v_review
    from public.orders
    where id = v_short_order_id;
  select used_count into v_uses from public.coupons where id = v_coupon_id;

  if v_stock is distinct from 1 then
    raise exception 'Shortage must not change stock, got %', v_stock;
  end if;
  if v_review is distinct from true or v_status is distinct from 'paid' then
    raise exception 'Shortage must stay paid with payment_review set, got % / %', v_status, v_review;
  end if;
  if v_paid is distinct from 'Paid & Cleared' then
    raise exception 'Shortage must still mark the payment paid, got %', v_paid;
  end if;
  if v_uses is distinct from 1 then
    raise exception 'Coupon must stay at 1, got %', v_uses;
  end if;

  update public.products set stock_quantity = 3, is_sold_out = false where id = v_product_id;
  insert into public.orders (
    status, payment_status, booking_status, items, total, total_amount,
    stock_hold, stock_hold_snapshot
  ) values (
    'pending_payment',
    'pending',
    'needs_booking',
    jsonb_build_array(jsonb_build_object('sku', v_sku, 'quantity', 1, 'boxes', 64, 'pallets', 1)),
    40, 40,
    true,
    jsonb_build_array(jsonb_build_object('sku', v_sku, 'pallets', 1))
  )
  returning id into v_held_order_id;

  perform public.settle_paid_order(v_held_order_id::text);
  select stock_quantity into v_stock from public.products where id = v_product_id;
  if v_stock is distinct from 3 then
    raise exception 'A checkout hold must not subtract pallets again, got %', v_stock;
  end if;
end;
$$;

rollback;
