-- 20" x 51 GA x 7,000 ft machine film. Scale weights, not roll x count + 22.05 lb tare.
-- Single roll (with core, no box): 30.600162 lbs
-- Pallet tare: 25.99352 lbs
-- Half pallet, 20 rolls (HPF-SF205170-HLP): 638.00 lbs
-- Full pallet, 40 rolls (HPF-SF205170-FLP): 1,250.01 lbs
-- Does not change hand film or the other machine-film specs.

ALTER TABLE public.products
  ALTER COLUMN roll_weight_lbs TYPE numeric(12, 6);

ALTER TABLE public.product_variants
  ALTER COLUMN roll_weight_lbs TYPE numeric(12, 6);

UPDATE public.products AS p
SET
  roll_weight_lbs = 30.600162,
  pallet_weight_lbs = 1250.01
WHERE p.slug = 'stretch-film-20-x-51-ga-x-7000ft'
   OR p.slug ILIKE '%20-51-7000%'
   OR p.part_number ILIKE '%20-51-7000%'
   OR (
     ROUND(p.width_inches::numeric) = 20
     AND ROUND(p.gauge::numeric) = 51
     AND ROUND(p.length_feet::numeric) = 7000
     AND lower(COALESCE(p.type::text, '')) NOT IN ('hand', 'manual')
   );

UPDATE public.product_variants AS v
SET
  roll_weight_lbs = 30.600162,
  box_weight_lbs = NULL,
  pallet_weight_lbs = CASE
    WHEN v.sku ILIKE '%-HLP' OR v.sku ILIKE '%-20R' OR COALESCE(v.rolls_count, 0) = 20 THEN 638.00
    ELSE 1250.01
  END
FROM public.products AS p
WHERE v.product_id = p.id
  AND (
    v.sku IN (
      'HPF-SF205170-HLP',
      'HPF-SF205170-FLP',
      'genesis-machine-film-20-51-7000-20R',
      'genesis-machine-film-20-51-7000-40R'
    )
    OR (
      (
        p.slug = 'stretch-film-20-x-51-ga-x-7000ft'
        OR p.slug ILIKE '%20-51-7000%'
        OR p.part_number ILIKE '%20-51-7000%'
        OR (
          ROUND(p.width_inches::numeric) = 20
          AND ROUND(p.gauge::numeric) = 51
          AND ROUND(p.length_feet::numeric) = 7000
        )
      )
      AND lower(COALESCE(p.type::text, '')) NOT IN ('hand', 'manual')
      AND (
        v.sku ILIKE '%20-51-7000%'
        OR COALESCE(v.rolls_count, 0) IN (20, 40)
      )
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
      WHEN v.sku ILIKE '%-HLP' OR v.sku ILIKE '%-20R' OR COALESCE(v.rolls_count, 0) = 20 THEN 638.00
      ELSE 1250.01
    END
    FROM public.products AS p
    WHERE v.product_id = p.id
      AND (
        v.sku IN (
          'HPF-SF205170-HLP',
          'HPF-SF205170-FLP',
          'genesis-machine-film-20-51-7000-20R',
          'genesis-machine-film-20-51-7000-40R'
        )
        OR (
          (
            p.slug = 'stretch-film-20-x-51-ga-x-7000ft'
            OR p.slug ILIKE '%20-51-7000%'
            OR (
              ROUND(p.width_inches::numeric) = 20
              AND ROUND(p.gauge::numeric) = 51
              AND ROUND(p.length_feet::numeric) = 7000
            )
          )
          AND lower(COALESCE(p.type::text, '')) NOT IN ('hand', 'manual')
          AND (
            v.sku ILIKE '%20-51-7000%'
            OR COALESCE(v.rolls_count, 0) IN (20, 40)
          )
        )
      );
  END IF;
END $$;
