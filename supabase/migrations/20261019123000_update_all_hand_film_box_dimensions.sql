-- 1-box hand stretch film cartons, split by film width.
-- 18 in: 11" W x 11" L x 19.5" H. 15 in: 11" W x 11" L x 16.5" H.
-- Empty carton is 1.00 lb. Filled box_weight_lbs and pallet_weight_lbs are not changed.
-- Only boxes_count = 1. Machine film, 20 in film, GP-*, GS-*, and boxes_count > 1 stay as they are.
-- products has title, slug, and part_number. It has no name column and no sku column.
-- The SKU lives on product_variants.sku.
-- Safe to re-run. Does not change package prices.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS box_length_in numeric(6, 2),
  ADD COLUMN IF NOT EXISTS box_width_in numeric(6, 2),
  ADD COLUMN IF NOT EXISTS box_height_in numeric(6, 2);

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS dimensions text,
  ADD COLUMN IF NOT EXISTS package_dimensions text,
  ADD COLUMN IF NOT EXISTS empty_box_weight_lbs numeric(8, 2);

-- 18 in hand film, 1 box.
UPDATE public.product_variants AS v
SET
  dimensions = '11" W x 11" L x 19.5" H',
  package_dimensions = '11" W x 11" L x 19.5" H',
  empty_box_weight_lbs = 1.00
FROM public.products AS p
WHERE v.product_id = p.id
  AND v.boxes_count = 1
  AND lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
  AND ROUND(COALESCE(p.width_inches, 0)::numeric) <> 20
  AND ROUND(COALESCE(p.width_inches, 0)::numeric) <> 15
  AND COALESCE(v.sku, '') NOT ILIKE 'GP-%'
  AND COALESCE(v.sku, '') NOT ILIKE 'GS-%'
  AND (
    COALESCE(v.sku, '') ILIKE 'FEL-18%'
    OR COALESCE(v.sku, '') ILIKE 'FST-18%'
    OR REPLACE(COALESCE(v.sku, ''), '-', '') ILIKE 'FEL18%'
    OR REPLACE(COALESCE(v.sku, ''), '-', '') ILIKE 'FST18%'
    OR COALESCE(p.part_number, '') ILIKE 'FEL-18%'
    OR COALESCE(p.part_number, '') ILIKE 'FST-18%'
    OR REPLACE(COALESCE(p.part_number, ''), '-', '') ILIKE 'FEL18%'
    OR REPLACE(COALESCE(p.part_number, ''), '-', '') ILIKE 'FST18%'
    OR COALESCE(p.slug, '') ILIKE 'stretch-film-18%'
    OR COALESCE(p.title, '') ILIKE '%18"%'
    OR COALESCE(v.title, '') ILIKE '%18"%'
    OR ROUND(p.width_inches::numeric) = 18
  );

-- 15 in hand film, 1 box.
UPDATE public.product_variants AS v
SET
  dimensions = '11" W x 11" L x 16.5" H',
  package_dimensions = '11" W x 11" L x 16.5" H',
  empty_box_weight_lbs = 1.00
FROM public.products AS p
WHERE v.product_id = p.id
  AND v.boxes_count = 1
  AND lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
  AND ROUND(COALESCE(p.width_inches, 0)::numeric) <> 20
  AND ROUND(COALESCE(p.width_inches, 0)::numeric) <> 18
  AND COALESCE(v.sku, '') NOT ILIKE 'GP-%'
  AND COALESCE(v.sku, '') NOT ILIKE 'GS-%'
  AND COALESCE(v.sku, '') NOT ILIKE 'FEL-18%'
  AND COALESCE(v.sku, '') NOT ILIKE 'FST-18%'
  AND (
    COALESCE(v.sku, '') ILIKE 'FEL-15%'
    OR COALESCE(v.sku, '') ILIKE 'FST-15%'
    OR REPLACE(COALESCE(v.sku, ''), '-', '') ILIKE 'FEL15%'
    OR REPLACE(COALESCE(v.sku, ''), '-', '') ILIKE 'FST15%'
    OR COALESCE(p.part_number, '') ILIKE 'FEL-15%'
    OR COALESCE(p.part_number, '') ILIKE 'FST-15%'
    OR REPLACE(COALESCE(p.part_number, ''), '-', '') ILIKE 'FEL15%'
    OR REPLACE(COALESCE(p.part_number, ''), '-', '') ILIKE 'FST15%'
    OR COALESCE(p.slug, '') ILIKE 'stretch-film-15%'
    OR COALESCE(p.title, '') ILIKE '%15"%'
    OR COALESCE(v.title, '') ILIKE '%15"%'
    OR ROUND(p.width_inches::numeric) = 15
  );

UPDATE public.products AS p
SET
  box_length_in = 11,
  box_width_in = 11,
  box_height_in = 19.5
WHERE lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
  AND ROUND(p.width_inches::numeric) = 18;

UPDATE public.products AS p
SET
  box_length_in = 11,
  box_width_in = 11,
  box_height_in = 16.5
WHERE lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
  AND ROUND(p.width_inches::numeric) = 15;
