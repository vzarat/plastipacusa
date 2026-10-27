-- Checkout was failing while reserving pallet stock when is_sold_out was null.
-- The hold kept that null, and a NOT NULL column rejected the row.
-- This only replaces the stock update. It does not change existing pallet counts.
-- Run the whole file in the Supabase SQL editor.

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
