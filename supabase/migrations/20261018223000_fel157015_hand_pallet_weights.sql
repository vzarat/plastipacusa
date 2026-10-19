-- Live Supabase products columns used here: title, slug, part_number, type,
-- width_inches, gauge, length_feet, pallet_weight_lbs.
-- products has no name column and no sku column. SKUs live on product_variants.sku.
-- FEL-157015 is 15 in x 70 ga x 1500 ft. Full pallet = 64 * 28.75 + 29.18.
-- Safe to re-run. Does not change package prices.

UPDATE public.product_variants AS v
SET
  box_weight_lbs = 28.75,
  pallet_weight_lbs = 1869.18
FROM public.products AS p
WHERE v.product_id = p.id
  AND (
    COALESCE(p.part_number, '') ILIKE '%FEL-157015%'
    OR COALESCE(p.slug, '') ILIKE '%fel-157015%'
    OR p.slug = 'stretch-film-15-x-70-ga-x-1500ft'
    OR COALESCE(p.title, '') ILIKE '%FEL-157015%'
    OR (
      ROUND(p.width_inches::numeric) = 15
      AND ROUND(p.gauge::numeric) = 70
      AND ROUND(p.length_feet::numeric) = 1500
      AND lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
    )
  );

UPDATE public.products AS p
SET pallet_weight_lbs = 1869.18
WHERE COALESCE(p.part_number, '') ILIKE '%FEL-157015%'
   OR COALESCE(p.slug, '') ILIKE '%fel-157015%'
   OR p.slug = 'stretch-film-15-x-70-ga-x-1500ft'
   OR COALESCE(p.title, '') ILIKE '%FEL-157015%'
   OR (
     ROUND(p.width_inches::numeric) = 15
     AND ROUND(p.gauge::numeric) = 70
     AND ROUND(p.length_feet::numeric) = 1500
     AND lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
   );

-- Other hand films keep their stored box weight. The full pallet is 64 boxes plus 29.18 lb.
UPDATE public.product_variants AS v
SET pallet_weight_lbs = ROUND((v.box_weight_lbs * 64 + 29.18)::numeric, 2)
FROM public.products AS p
WHERE v.product_id = p.id
  AND v.box_weight_lbs IS NOT NULL
  AND v.box_weight_lbs > 0
  AND lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
  AND ROUND(COALESCE(p.width_inches, 0)::numeric) <> 20;

UPDATE public.products AS p
SET pallet_weight_lbs = ROUND((src.box_weight_lbs * 64 + 29.18)::numeric, 2)
FROM (
  SELECT product_id, MAX(box_weight_lbs) AS box_weight_lbs
  FROM public.product_variants
  WHERE box_weight_lbs IS NOT NULL
    AND box_weight_lbs > 0
  GROUP BY product_id
) AS src
WHERE p.id = src.product_id
  AND lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
  AND ROUND(COALESCE(p.width_inches, 0)::numeric) <> 20;
