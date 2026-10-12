-- Run in Supabase. Do not guess pallet inches; fill them after you measure a pallet.
-- Weight columns already exist (roll_weight_lbs, box_weight_lbs, pallet_weight_lbs).
-- If those weights are still empty, also run supabase/migrations/update_product_weights.sql.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS pallet_length_in numeric(6, 2),
  ADD COLUMN IF NOT EXISTS pallet_width_in numeric(6, 2),
  ADD COLUMN IF NOT EXISTS pallet_height_in numeric(6, 2);

COMMENT ON COLUMN public.products.pallet_length_in IS 'Pallet length in inches. Required for Warp quotes.';
COMMENT ON COLUMN public.products.pallet_width_in IS 'Pallet width in inches. Required for Warp quotes.';
COMMENT ON COLUMN public.products.pallet_height_in IS 'Pallet height in inches. Required for Warp quotes.';

-- Until the inch columns are read by the app, you can also store the same size as text:
-- UPDATE public.products SET pallet_dimensions = 'LENGTH x WIDTH x HEIGHT' WHERE pallet_dimensions IS NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_provider text,
  ADD COLUMN IF NOT EXISTS shipping_mode text,
  ADD COLUMN IF NOT EXISTS shipping_service text,
  ADD COLUMN IF NOT EXISTS shipping_quote_id text,
  ADD COLUMN IF NOT EXISTS shipping_transit_days integer,
  ADD COLUMN IF NOT EXISTS destination_zip text;
