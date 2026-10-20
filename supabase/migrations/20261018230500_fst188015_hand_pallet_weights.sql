-- FST-188015: 18 in x 80 ga x 1500 ft.
-- One box is 40.06 lb. Full pallet is 2,525.13 lb (production scale).
-- 16 boxes = 670.13 lb (16 * 40.06 + 29.20).
-- 32 boxes = 1,311.06 lb (32 * 40.06 + 29.20).
-- Prefer the later migration 20261020123000_update_fst_188015_exact_weights.sql.
-- Live product_variants columns: boxes_count, sku, box_weight_lbs, pallet_weight_lbs.
-- There is no package_tier_boxes column and no weight_lbs column.
-- products has title, slug, and part_number. It has no name column and no sku column.
-- The SKU lives on product_variants.sku.
-- Safe to re-run. Does not change package prices.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS box_weight_lbs numeric(8, 2),
  ADD COLUMN IF NOT EXISTS pallet_weight_lbs numeric(8, 2);

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS box_weight_lbs numeric(8, 2),
  ADD COLUMN IF NOT EXISTS pallet_weight_lbs numeric(8, 2);

-- box_weight_lbs stays the single-box weight on every boxes_count tier.
-- 16 and 32 boxes are boxes * 40.06 + pallet tare in the app / printed map.
-- pallet_weight_lbs stays the exact 64-box production weight, including when boxes_count is 1, 16, or 32.
UPDATE public.product_variants AS v
SET
  box_weight_lbs = 40.06,
  pallet_weight_lbs = 2525.13
FROM public.products AS p
WHERE v.product_id = p.id
  AND (
    COALESCE(v.sku, '') ILIKE '%FST-188015%'
    OR REPLACE(COALESCE(v.sku, ''), '-', '') ILIKE '%FST188015%'
    OR COALESCE(p.part_number, '') ILIKE '%FST-188015%'
    OR REPLACE(COALESCE(p.part_number, ''), '-', '') ILIKE '%FST188015%'
    OR COALESCE(p.slug, '') ILIKE '%fst-188015%'
    OR p.slug = 'stretch-film-18-x-80-ga-x-1500ft'
    OR COALESCE(p.title, '') ILIKE '%FST-188015%'
    OR (
      ROUND(p.width_inches::numeric) = 18
      AND ROUND(p.gauge::numeric) = 80
      AND ROUND(p.length_feet::numeric) = 1500
      AND lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
    )
  );

UPDATE public.products AS p
SET
  box_weight_lbs = 40.06,
  pallet_weight_lbs = 2525.13
WHERE COALESCE(p.part_number, '') ILIKE '%FST-188015%'
   OR REPLACE(COALESCE(p.part_number, ''), '-', '') ILIKE '%FST188015%'
   OR COALESCE(p.slug, '') ILIKE '%fst-188015%'
   OR p.slug = 'stretch-film-18-x-80-ga-x-1500ft'
   OR COALESCE(p.title, '') ILIKE '%FST-188015%'
   OR EXISTS (
     SELECT 1
     FROM public.product_variants AS v
     WHERE v.product_id = p.id
       AND (
         COALESCE(v.sku, '') ILIKE '%FST-188015%'
         OR REPLACE(COALESCE(v.sku, ''), '-', '') ILIKE '%FST188015%'
       )
   )
   OR (
     ROUND(p.width_inches::numeric) = 18
     AND ROUND(p.gauge::numeric) = 80
     AND ROUND(p.length_feet::numeric) = 1500
     AND lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
   );
