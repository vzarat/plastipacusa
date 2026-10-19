-- FEL-156010: 15 in x 60 ga x 1000 ft.
-- Live products columns: title, slug, part_number, type, width_inches, gauge, length_feet.
-- products has no name column and no sku column.
-- One box is 25.13 lb. Full pallet = 64 * 25.13 + 29.18 = 1637.50.
-- Safe to re-run. Does not change package prices.

UPDATE public.product_variants AS v
SET
  box_weight_lbs = 25.13,
  pallet_weight_lbs = 1637.50
FROM public.products AS p
WHERE v.product_id = p.id
  AND (
    COALESCE(p.part_number, '') ILIKE '%FEL-156010%'
    OR COALESCE(p.slug, '') ILIKE '%fel-156010%'
    OR p.slug = 'stretch-film-15-x-60-ga-x-1000ft'
    OR COALESCE(p.title, '') ILIKE '%FEL-156010%'
    OR (
      ROUND(p.width_inches::numeric) = 15
      AND ROUND(p.gauge::numeric) = 60
      AND ROUND(p.length_feet::numeric) = 1000
      AND lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
    )
  );

UPDATE public.products AS p
SET pallet_weight_lbs = 1637.50
WHERE COALESCE(p.part_number, '') ILIKE '%FEL-156010%'
   OR COALESCE(p.slug, '') ILIKE '%fel-156010%'
   OR p.slug = 'stretch-film-15-x-60-ga-x-1000ft'
   OR COALESCE(p.title, '') ILIKE '%FEL-156010%'
   OR (
     ROUND(p.width_inches::numeric) = 15
     AND ROUND(p.gauge::numeric) = 60
     AND ROUND(p.length_feet::numeric) = 1000
     AND lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
   );
