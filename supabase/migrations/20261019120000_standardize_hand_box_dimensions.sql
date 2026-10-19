-- Hand stretch film, 1 box / 4 rolls.
-- Carton size is 11" W x 11" L x 19.5" H (was 12" W x 12" L x 19.5" H).
-- The empty carton weighs about 1.00 lb (0.450 kg).
-- box_weight_lbs and pallet_weight_lbs stay the filled-package weights.
-- products has title, slug, part_number, and type. It has no name column and no sku column.
-- Live tier column is product_variants.boxes_count. rolls_count covers the same 1-box row when boxes_count is empty.
-- Safe to re-run. Does not change package prices.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS box_length_in numeric(6, 2),
  ADD COLUMN IF NOT EXISTS box_width_in numeric(6, 2),
  ADD COLUMN IF NOT EXISTS box_height_in numeric(6, 2);

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS package_dimensions text,
  ADD COLUMN IF NOT EXISTS empty_box_weight_lbs numeric(8, 2);

UPDATE public.product_variants AS v
SET
  package_dimensions = '11" W x 11" L x 19.5" H',
  empty_box_weight_lbs = 1.00
FROM public.products AS p
WHERE v.product_id = p.id
  AND (
    v.boxes_count = 1
    OR (
      COALESCE(v.boxes_count, 0) = 0
      AND COALESCE(v.rolls_count, 0) BETWEEN 1 AND 4
    )
  )
  AND lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
  AND ROUND(COALESCE(p.width_inches, 0)::numeric) <> 20
  AND (
    lower(COALESCE(p.type::text, '')) IN ('hand', 'manual')
    OR COALESCE(p.slug, '') ILIKE '%stretch-film%'
    OR COALESCE(p.title, '') ILIKE '%stretch film%'
    OR COALESCE(p.title, '') ILIKE '%hand%'
    OR ROUND(COALESCE(p.width_inches, 0)::numeric) IN (12, 15, 18)
  );

UPDATE public.products AS p
SET
  box_length_in = 11,
  box_width_in = 11,
  box_height_in = 19.5
WHERE lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
  AND ROUND(COALESCE(p.width_inches, 0)::numeric) <> 20
  AND (
    lower(COALESCE(p.type::text, '')) IN ('hand', 'manual')
    OR COALESCE(p.slug, '') ILIKE '%stretch-film%'
    OR COALESCE(p.title, '') ILIKE '%stretch film%'
    OR COALESCE(p.title, '') ILIKE '%hand%'
    OR ROUND(COALESCE(p.width_inches, 0)::numeric) IN (12, 15, 18)
  );
