-- 20" x 70 GA x 5,000 ft machine film. Scale weights, not roll x count + 22.05 lb tare.
-- Single roll (with core, no box): 30.049006 lbs
-- Half pallet, 20 rolls (HPF-SF207050-HLP): 627.19 lbs, including pallet tare
-- Full pallet, 40 rolls (HPF-SF207050-FLP): 1,228.17 lbs, including pallet tare
-- Pallet size: 40" W x 48" L x 46" H
-- Does not change hand film or the other machine-film specs.

ALTER TABLE public.products
  ALTER COLUMN roll_weight_lbs TYPE numeric(12, 6);

ALTER TABLE public.product_variants
  ALTER COLUMN roll_weight_lbs TYPE numeric(12, 6);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS pallet_length_in numeric(6, 2),
  ADD COLUMN IF NOT EXISTS pallet_width_in numeric(6, 2),
  ADD COLUMN IF NOT EXISTS pallet_height_in numeric(6, 2),
  ADD COLUMN IF NOT EXISTS pallet_dimensions text,
  ADD COLUMN IF NOT EXISTS half_pallet_length_in numeric(6, 2),
  ADD COLUMN IF NOT EXISTS half_pallet_width_in numeric(6, 2),
  ADD COLUMN IF NOT EXISTS half_pallet_height_in numeric(6, 2);

UPDATE public.products AS p
SET
  roll_weight_lbs = 30.049006,
  pallet_weight_lbs = 1228.17,
  pallet_length_in = 48,
  pallet_width_in = 40,
  pallet_height_in = 46,
  half_pallet_length_in = 48,
  half_pallet_width_in = 40,
  half_pallet_height_in = 46,
  pallet_dimensions = '48 x 40 x 46'
WHERE p.slug = 'stretch-film-20-x-70-ga-x-5000ft'
   OR p.slug ILIKE '%20-70-5000%'
   OR p.slug ILIKE '%70-ga-x-5000%'
   OR COALESCE(p.part_number, '') ILIKE '%FST-20705000%'
   OR COALESCE(p.part_number, '') ILIKE '%207050%'
   OR (
     ROUND(p.width_inches::numeric) = 20
     AND ROUND(p.gauge::numeric) = 70
     AND ROUND(p.length_feet::numeric) = 5000
     AND lower(COALESCE(p.type::text, '')) NOT IN ('hand', 'manual')
   );

UPDATE public.product_variants AS v
SET
  roll_weight_lbs = 30.049006,
  box_weight_lbs = NULL,
  pallet_weight_lbs = CASE
    WHEN v.sku ILIKE '%-HLP' OR v.sku ILIKE '%-20R' OR COALESCE(v.rolls_count, 0) = 20 THEN 627.19
    ELSE 1228.17
  END
FROM public.products AS p
WHERE v.product_id = p.id
  AND (
    v.sku IN ('HPF-SF207050-HLP', 'HPF-SF207050-FLP', 'FST-20705000-20R', 'FST-20705000-40R')
    OR v.sku ILIKE '%207050%'
    OR (
      (
        p.slug = 'stretch-film-20-x-70-ga-x-5000ft'
        OR p.slug ILIKE '%70-ga-x-5000%'
        OR p.slug ILIKE '%20-x-70%'
        OR COALESCE(p.part_number, '') ILIKE '%207050%'
        OR (
          ROUND(p.width_inches::numeric) = 20
          AND ROUND(p.gauge::numeric) = 70
          AND ROUND(p.length_feet::numeric) = 5000
        )
      )
      AND lower(COALESCE(p.type::text, '')) NOT IN ('hand', 'manual')
      AND COALESCE(v.rolls_count, 0) IN (20, 40)
    )
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_variants'
      AND column_name = 'weight_lbs'
  ) THEN
    UPDATE public.product_variants AS v
    SET weight_lbs = CASE
      WHEN v.sku ILIKE '%-HLP' OR v.sku ILIKE '%-20R' OR COALESCE(v.rolls_count, 0) = 20 THEN 627.19
      ELSE 1228.17
    END
    FROM public.products AS p
    WHERE v.product_id = p.id
      AND v.sku IN ('HPF-SF207050-HLP', 'HPF-SF207050-FLP', 'FST-20705000-20R', 'FST-20705000-40R');
  END IF;
END $$;
