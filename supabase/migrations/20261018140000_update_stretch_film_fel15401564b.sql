-- Migration: Update weight specs and dimensions for 15" x 40 GA x 1500 FT (FEL-154015-64B)
-- Not applied by the app. Run in Supabase.

UPDATE public.product_variants
SET
  box_weight_lbs = 18.00,
  pallet_weight_lbs = 1175.74
WHERE product_id = (
  SELECT product_id FROM public.product_variants WHERE sku = 'FEL-154015-64B'
);

UPDATE public.products
SET
  pallet_weight_lbs = 1175.74,
  pallet_dimensions = '48 x 48 x 66'
WHERE id = (
  SELECT product_id FROM public.product_variants WHERE sku = 'FEL-154015-64B'
);
