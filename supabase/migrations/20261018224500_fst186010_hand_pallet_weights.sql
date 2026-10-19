-- FST-186010: 18 in x 60 ga x 1000 ft.
-- One box is 21.68 lb. Full pallet is 1,416.88 lb.
-- 16 boxes = 376.06 lb. 32 boxes = 722.94 lb.
-- product_variants has no package_tier_boxes column.
-- Live tier column is boxes_count (1, 16, 32, 64). Drizzle names the same idea rolls_per_box.
-- Weight columns: box_weight_lbs, pallet_weight_lbs, and weight_lbs when that column exists.
-- products has title, slug, and part_number. It has no name column and no sku column.
-- Safe to re-run. Does not change package prices.

DO $fix$
DECLARE
  tier_weight text;
  assignments text := 'box_weight_lbs = 21.68, pallet_weight_lbs = 1416.88';
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_variants'
      AND column_name = 'boxes_count'
  ) THEN
    tier_weight := $w$
      CASE
        WHEN v.boxes_count = 1 THEN 21.68
        WHEN v.boxes_count = 16 THEN 376.06
        WHEN v.boxes_count = 32 THEN 722.94
        WHEN v.boxes_count >= 64 THEN 1416.88
        ELSE NULL
      END
    $w$;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_variants'
      AND column_name = 'rolls_count'
  ) THEN
    tier_weight := $w$
      CASE
        WHEN v.rolls_count <= 4 THEN 21.68
        WHEN v.rolls_count = 64 THEN 376.06
        WHEN v.rolls_count = 128 THEN 722.94
        WHEN v.rolls_count >= 256 THEN 1416.88
        ELSE NULL
      END
    $w$;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_variants'
      AND column_name = 'rolls_per_box'
  ) THEN
    tier_weight := $w$
      CASE
        WHEN v.rolls_per_box <= 4 THEN 21.68
        WHEN v.rolls_per_box = 64 THEN 376.06
        WHEN v.rolls_per_box = 128 THEN 722.94
        WHEN v.rolls_per_box >= 256 THEN 1416.88
        ELSE NULL
      END
    $w$;
  ELSE
    tier_weight := NULL;
  END IF;

  IF tier_weight IS NOT NULL AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_variants'
      AND column_name = 'weight_lbs'
  ) THEN
    assignments := assignments || ', weight_lbs = COALESCE((' || tier_weight || '), v.weight_lbs)';
  END IF;

  EXECUTE
    'UPDATE public.product_variants AS v
     SET ' || assignments || '
     FROM public.products AS p
     WHERE v.product_id = p.id
       AND (
         COALESCE(p.part_number, '''') ILIKE ''%FST-186010%''
         OR COALESCE(p.slug, '''') ILIKE ''%fst-186010%''
         OR p.slug = ''stretch-film-18-x-60-ga-x-1000ft''
         OR COALESCE(p.title, '''') ILIKE ''%FST-186010%''
         OR (
           ROUND(p.width_inches::numeric) = 18
           AND ROUND(p.gauge::numeric) = 60
           AND ROUND(p.length_feet::numeric) = 1000
           AND lower(COALESCE(p.type::text, '''')) NOT IN (''machine'', ''automatic'')
         )
       )';
END
$fix$;

UPDATE public.products AS p
SET pallet_weight_lbs = 1416.88
WHERE COALESCE(p.part_number, '') ILIKE '%FST-186010%'
   OR COALESCE(p.slug, '') ILIKE '%fst-186010%'
   OR p.slug = 'stretch-film-18-x-60-ga-x-1000ft'
   OR COALESCE(p.title, '') ILIKE '%FST-186010%'
   OR (
     ROUND(p.width_inches::numeric) = 18
     AND ROUND(p.gauge::numeric) = 60
     AND ROUND(p.length_feet::numeric) = 1000
     AND lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
   );
