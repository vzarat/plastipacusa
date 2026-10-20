-- 20" x 51 GA x 9,000 ft machine film. Scale weights, not roll x count + 22.05 lb tare.
-- Single roll (with core, no box): 38.779312 lbs
-- Half pallet, 20 rolls (HPF-SF205190-HLP): 802.13 lbs, including pallet tare
-- Full pallet, 40 rolls (HPF-SF205190-FLP): 1,577.71 lbs, including pallet tare
-- Every automatic / machine pallet is 40" W x 48" L x 46" H, half and full.
-- Does not change hand film.

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
  roll_weight_lbs = 38.779312,
  pallet_weight_lbs = 1577.71
WHERE p.slug = 'stretch-film-20-x-51-ga-x-9000ft'
   OR p.slug ILIKE '%20-51-9000%'
   OR p.slug ILIKE '%51-ga-x-9000%'
   OR COALESCE(p.part_number, '') ILIKE '%FST-20519000%'
   OR COALESCE(p.part_number, '') ILIKE '%205190%'
   OR (
     ROUND(p.width_inches::numeric) = 20
     AND ROUND(p.gauge::numeric) = 51
     AND ROUND(p.length_feet::numeric) = 9000
     AND lower(COALESCE(p.type::text, '')) NOT IN ('hand', 'manual')
   );

UPDATE public.product_variants AS v
SET
  roll_weight_lbs = 38.779312,
  box_weight_lbs = NULL,
  pallet_weight_lbs = CASE
    WHEN v.sku ILIKE '%-HLP' OR v.sku ILIKE '%-20R' OR COALESCE(v.rolls_count, 0) = 20 THEN 802.13
    ELSE 1577.71
  END
FROM public.products AS p
WHERE v.product_id = p.id
  AND (
    v.sku IN ('HPF-SF205190-HLP', 'HPF-SF205190-FLP', 'FST-20519000-20R', 'FST-20519000-40R')
    OR (
      (
        p.slug = 'stretch-film-20-x-51-ga-x-9000ft'
        OR p.slug ILIKE '%20-51-9000%'
        OR p.slug ILIKE '%51-ga-x-9000%'
        OR COALESCE(p.part_number, '') ILIKE '%FST-20519000%'
        OR COALESCE(p.part_number, '') ILIKE '%205190%'
        OR (
          ROUND(p.width_inches::numeric) = 20
          AND ROUND(p.gauge::numeric) = 51
          AND ROUND(p.length_feet::numeric) = 9000
        )
      )
      AND lower(COALESCE(p.type::text, '')) NOT IN ('hand', 'manual')
      AND (
        v.sku ILIKE '%9000%'
        OR COALESCE(v.rolls_count, 0) IN (20, 40)
      )
    )
  );

-- Standardized 46 in height for every automatic pallet, including the wooden pallet.
UPDATE public.products AS p
SET
  pallet_length_in = 48,
  pallet_width_in = 40,
  pallet_height_in = 46,
  half_pallet_length_in = 48,
  half_pallet_width_in = 40,
  half_pallet_height_in = 46,
  pallet_dimensions = '48 x 40 x 46'
WHERE lower(COALESCE(p.type::text, '')) IN ('machine', 'automatic')
   OR COALESCE(p.slug, '') ILIKE 'stretch-film-20%'
   OR (
     ROUND(COALESCE(p.width_inches, 0)::numeric) = 20
     AND lower(COALESCE(p.type::text, '')) NOT IN ('hand', 'manual')
     AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-12%'
     AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-15%'
     AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-18%'
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
      WHEN v.sku ILIKE '%-HLP' OR v.sku ILIKE '%-20R' OR COALESCE(v.rolls_count, 0) = 20 THEN 802.13
      ELSE 1577.71
    END
    FROM public.products AS p
    WHERE v.product_id = p.id
      AND (
        v.sku IN ('HPF-SF205190-HLP', 'HPF-SF205190-FLP', 'FST-20519000-20R', 'FST-20519000-40R')
        OR (
          (
            p.slug = 'stretch-film-20-x-51-ga-x-9000ft'
            OR p.slug ILIKE '%51%9000%'
            OR (
              ROUND(p.width_inches::numeric) = 20
              AND ROUND(p.gauge::numeric) = 51
              AND ROUND(p.length_feet::numeric) = 9000
            )
          )
          AND lower(COALESCE(p.type::text, '')) NOT IN ('hand', 'manual')
          AND (
            v.sku ILIKE '%9000%'
            OR COALESCE(v.rolls_count, 0) IN (20, 40)
          )
        )
      );
  END IF;
END $$;
