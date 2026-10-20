-- FST-188010: 18 in x 80 ga x 1000 ft.
-- Roll weight 6.878423 lb. Box tare ~0.99 lb (0.450 kg).
-- One box (4 rolls + carton) is 28.51 lb.
-- Pallet tare for the printed tier map is 29.20 lb.
-- 16 boxes = 485.29 lb (16 * 28.51 + 29.20, display map).
-- 32 boxes = 941.38 lb (32 * 28.51 + 29.20, display map).
-- Full pallet (64 boxes) is the production scale weight 1,786.29 lb.
-- Live product_variants columns: boxes_count, sku, box_weight_lbs, pallet_weight_lbs,
-- dimensions, package_dimensions, empty_box_weight_lbs.
-- There is no package_tier_boxes column and no total_weight_lbs / weight_lbs column.
-- products has title, slug, and part_number. It has no name column and no sku column.
-- The SKU lives on product_variants.sku.
-- Safe to re-run. Does not change package prices.
-- Does not touch FST-188015 (18 x 80 x 1500).

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS box_weight_lbs numeric(8, 2),
  ADD COLUMN IF NOT EXISTS pallet_weight_lbs numeric(8, 2),
  ADD COLUMN IF NOT EXISTS box_length_in numeric(6, 2),
  ADD COLUMN IF NOT EXISTS box_width_in numeric(6, 2),
  ADD COLUMN IF NOT EXISTS box_height_in numeric(6, 2);

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS box_weight_lbs numeric(8, 2),
  ADD COLUMN IF NOT EXISTS pallet_weight_lbs numeric(8, 2),
  ADD COLUMN IF NOT EXISTS dimensions text,
  ADD COLUMN IF NOT EXISTS package_dimensions text,
  ADD COLUMN IF NOT EXISTS empty_box_weight_lbs numeric(8, 2);

-- box_weight_lbs stays the single-box weight on every boxes_count tier.
-- 16 and 32 boxes are boxes * 28.51 + pallet tare in the app / printed map.
-- pallet_weight_lbs stays the exact 64-box production weight, including when
-- boxes_count is 1, 16, or 32.
UPDATE public.product_variants AS v
SET
  box_weight_lbs = 28.51,
  pallet_weight_lbs = 1786.29
FROM public.products AS p
WHERE v.product_id = p.id
  AND (
    COALESCE(v.sku, '') ILIKE '%FST-188010%'
    OR REPLACE(COALESCE(v.sku, ''), '-', '') ILIKE '%FST188010%'
    OR COALESCE(p.part_number, '') ILIKE '%FST-188010%'
    OR REPLACE(COALESCE(p.part_number, ''), '-', '') ILIKE '%FST188010%'
    OR COALESCE(p.slug, '') ILIKE '%fst-188010%'
    OR p.slug = 'stretch-film-18-x-80-ga-x-1000ft'
    OR COALESCE(p.title, '') ILIKE '%FST-188010%'
    OR (
      ROUND(p.width_inches::numeric) = 18
      AND ROUND(p.gauge::numeric) = 80
      AND ROUND(p.length_feet::numeric) = 1000
      AND lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
    )
  );

UPDATE public.products AS p
SET
  box_weight_lbs = 28.51,
  pallet_weight_lbs = 1786.29,
  box_length_in = 11,
  box_width_in = 11,
  box_height_in = 19.5
WHERE COALESCE(p.part_number, '') ILIKE '%FST-188010%'
   OR REPLACE(COALESCE(p.part_number, ''), '-', '') ILIKE '%FST188010%'
   OR COALESCE(p.slug, '') ILIKE '%fst-188010%'
   OR p.slug = 'stretch-film-18-x-80-ga-x-1000ft'
   OR COALESCE(p.title, '') ILIKE '%FST-188010%'
   OR EXISTS (
     SELECT 1
     FROM public.product_variants AS v
     WHERE v.product_id = p.id
       AND (
         COALESCE(v.sku, '') ILIKE '%FST-188010%'
         OR REPLACE(COALESCE(v.sku, ''), '-', '') ILIKE '%FST188010%'
       )
   )
   OR (
     ROUND(p.width_inches::numeric) = 18
     AND ROUND(p.gauge::numeric) = 80
     AND ROUND(p.length_feet::numeric) = 1000
     AND lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
   );

-- 1-box carton only. Multi-box tiers keep their pallet package sizes.
UPDATE public.product_variants AS v
SET
  dimensions = '11" W x 11" L x 19.5" H',
  package_dimensions = '11" W x 11" L x 19.5" H',
  empty_box_weight_lbs = 0.99
FROM public.products AS p
WHERE v.product_id = p.id
  AND v.boxes_count = 1
  AND (
    COALESCE(v.sku, '') ILIKE '%FST-188010%'
    OR REPLACE(COALESCE(v.sku, ''), '-', '') ILIKE '%FST188010%'
    OR COALESCE(p.part_number, '') ILIKE '%FST-188010%'
    OR REPLACE(COALESCE(p.part_number, ''), '-', '') ILIKE '%FST188010%'
    OR COALESCE(p.slug, '') ILIKE '%fst-188010%'
    OR p.slug = 'stretch-film-18-x-80-ga-x-1000ft'
    OR COALESCE(p.title, '') ILIKE '%FST-188010%'
    OR (
      ROUND(p.width_inches::numeric) = 18
      AND ROUND(p.gauge::numeric) = 80
      AND ROUND(p.length_feet::numeric) = 1000
      AND lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
    )
  );
