-- FST-187010: 18 in x 70 ga x 1000 ft.
-- One box is 27.51 lb. Full pallet is 1,789.82 lb (64 * 27.51 + 29.18).
-- 16 boxes = 469.34 lb (16 * 27.51 + 29.18).
-- 32 boxes = 909.50 lb (32 * 27.51 + 29.18).
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
-- 16 and 32 boxes are boxes * 27.51 + 29.18 in the app.
-- pallet_weight_lbs stays the exact 64-box weight, including when boxes_count is 1, 16, or 32.
UPDATE public.product_variants AS v
SET
  box_weight_lbs = 27.51,
  pallet_weight_lbs = 1789.82
FROM public.products AS p
WHERE v.product_id = p.id
  AND (
    COALESCE(v.sku, '') ILIKE '%FST-187010%'
    OR REPLACE(COALESCE(v.sku, ''), '-', '') ILIKE '%FST187010%'
    OR COALESCE(p.part_number, '') ILIKE '%FST-187010%'
    OR REPLACE(COALESCE(p.part_number, ''), '-', '') ILIKE '%FST187010%'
    OR COALESCE(p.slug, '') ILIKE '%fst-187010%'
    OR p.slug = 'stretch-film-18-x-70-ga-x-1000ft'
    OR COALESCE(p.title, '') ILIKE '%FST-187010%'
    OR (
      ROUND(p.width_inches::numeric) = 18
      AND ROUND(p.gauge::numeric) = 70
      AND ROUND(p.length_feet::numeric) = 1000
      AND lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
    )
  );

UPDATE public.products AS p
SET
  box_weight_lbs = 27.51,
  pallet_weight_lbs = 1789.82
WHERE COALESCE(p.part_number, '') ILIKE '%FST-187010%'
   OR REPLACE(COALESCE(p.part_number, ''), '-', '') ILIKE '%FST187010%'
   OR COALESCE(p.slug, '') ILIKE '%fst-187010%'
   OR p.slug = 'stretch-film-18-x-70-ga-x-1000ft'
   OR COALESCE(p.title, '') ILIKE '%FST-187010%'
   OR EXISTS (
     SELECT 1
     FROM public.product_variants AS v
     WHERE v.product_id = p.id
       AND (
         COALESCE(v.sku, '') ILIKE '%FST-187010%'
         OR REPLACE(COALESCE(v.sku, ''), '-', '') ILIKE '%FST187010%'
       )
   )
   OR (
     ROUND(p.width_inches::numeric) = 18
     AND ROUND(p.gauge::numeric) = 70
     AND ROUND(p.length_feet::numeric) = 1000
     AND lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
   );
