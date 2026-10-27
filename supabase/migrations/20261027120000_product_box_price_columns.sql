-- Box and package price columns the storefront and admin already read.
-- Adds them only when missing. Does not update or delete existing rows.
-- Safe to re-run. Run the whole file in the Supabase SQL editor.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_1_box numeric(10, 2),
  ADD COLUMN IF NOT EXISTS price_16_boxes numeric(10, 2),
  ADD COLUMN IF NOT EXISTS price_32_boxes numeric(10, 2),
  ADD COLUMN IF NOT EXISTS price_64_boxes numeric(10, 2),
  ADD COLUMN IF NOT EXISTS price_6_rolls numeric(10, 2),
  ADD COLUMN IF NOT EXISTS price_12_rolls numeric(10, 2),
  ADD COLUMN IF NOT EXISTS price_20_rolls numeric(10, 2),
  ADD COLUMN IF NOT EXISTS price_40_rolls numeric(10, 2),
  ADD COLUMN IF NOT EXISTS price_case numeric(10, 2),
  ADD COLUMN IF NOT EXISTS price_half_pallet numeric(10, 2),
  ADD COLUMN IF NOT EXISTS price_pallet numeric(10, 2),
  ADD COLUMN IF NOT EXISTS price_usd numeric(10, 2),
  ADD COLUMN IF NOT EXISTS image_url text;
