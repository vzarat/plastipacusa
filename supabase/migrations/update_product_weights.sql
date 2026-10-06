-- Official production spec weights, converted to pounds.
-- Hand film: 4 rolls per box, 256 rolls per full pallet.
-- Full-pallet weight includes the 10 kg / 22.05 lb wooden pallet.
-- Safe to re-run. Matches an existing product by slug or by width, gauge, and length.

UPDATE public.products AS p
SET
  roll_weight_lbs = spec.roll_lbs,
  pallet_weight_lbs = spec.pallet_lbs
FROM (
  VALUES
    ('stretch-film-18-x-60-ga-x-1000ft', 18::numeric, 60::numeric, 1000::numeric, 6.15::numeric, 1596.7::numeric),
    ('stretch-film-18-x-70-ga-x-1000ft', 18::numeric, 70::numeric, 1000::numeric, 6.88::numeric, 1783.0::numeric),
    ('stretch-film-18-x-80-ga-x-1000ft', 18::numeric, 80::numeric, 1000::numeric, 8.66::numeric, 2240.2::numeric),
    ('stretch-film-18-x-60-ga-x-1500ft', 18::numeric, 60::numeric, 1500::numeric, 7.61::numeric, 1969.2::numeric),
    ('stretch-film-18-x-70-ga-x-1500ft', 18::numeric, 70::numeric, 1500::numeric, 8.69::numeric, 2245.8::numeric),
    ('stretch-film-18-x-80-ga-x-1500ft', 18::numeric, 80::numeric, 1500::numeric, 9.77::numeric, 2522.3::numeric),
    ('stretch-film-15-x-40-ga-x-1500ft', 15::numeric, 40::numeric, 1500::numeric, 4.50::numeric, 1173.5::numeric),
    ('stretch-film-15-x-60-ga-x-1000ft', 15::numeric, 60::numeric, 1000::numeric, 5.42::numeric, 1410.3::numeric),
    ('stretch-film-15-x-60-ga-x-1500ft', 15::numeric, 60::numeric, 1500::numeric, 6.28::numeric, 1630.5::numeric),
    ('stretch-film-15-x-70-ga-x-1500ft', 15::numeric, 70::numeric, 1500::numeric, 7.19::numeric, 1862.0::numeric),
    ('stretch-film-15-x-80-ga-x-1500ft', 15::numeric, 80::numeric, 1500::numeric, 8.09::numeric, 2093.3::numeric)
) AS spec(slug, width_in, gauge, length_ft, roll_lbs, pallet_lbs)
WHERE p.slug = spec.slug
   OR (
     ROUND(p.width_inches::numeric) = spec.width_in
     AND ROUND(p.gauge::numeric) = spec.gauge
     AND ROUND(p.length_feet::numeric) = spec.length_ft
   );

-- Same roll, box, and full-pallet weights on every package tier of that film.
-- pallet_weight_lbs is the 256-roll pallet plus the 22.05 lb wooden pallet.
UPDATE public.product_variants AS v
SET
  roll_weight_lbs = spec.roll_lbs,
  box_weight_lbs = spec.box_lbs,
  pallet_weight_lbs = spec.pallet_lbs
FROM public.products AS p
JOIN (
  VALUES
    ('stretch-film-18-x-60-ga-x-1000ft', 18::numeric, 60::numeric, 1000::numeric, 6.15::numeric, 24.60::numeric, 1596.7::numeric),
    ('stretch-film-18-x-70-ga-x-1000ft', 18::numeric, 70::numeric, 1000::numeric, 6.88::numeric, 27.51::numeric, 1783.0::numeric),
    ('stretch-film-18-x-80-ga-x-1000ft', 18::numeric, 80::numeric, 1000::numeric, 8.66::numeric, 34.65::numeric, 2240.2::numeric),
    ('stretch-film-18-x-60-ga-x-1500ft', 18::numeric, 60::numeric, 1500::numeric, 7.61::numeric, 30.42::numeric, 1969.2::numeric),
    ('stretch-film-18-x-70-ga-x-1500ft', 18::numeric, 70::numeric, 1500::numeric, 8.69::numeric, 34.74::numeric, 2245.8::numeric),
    ('stretch-film-18-x-80-ga-x-1500ft', 18::numeric, 80::numeric, 1500::numeric, 9.77::numeric, 39.07::numeric, 2522.3::numeric),
    ('stretch-film-15-x-40-ga-x-1500ft', 15::numeric, 40::numeric, 1500::numeric, 4.50::numeric, 18.00::numeric, 1173.5::numeric),
    ('stretch-film-15-x-60-ga-x-1000ft', 15::numeric, 60::numeric, 1000::numeric, 5.42::numeric, 21.69::numeric, 1410.3::numeric),
    ('stretch-film-15-x-60-ga-x-1500ft', 15::numeric, 60::numeric, 1500::numeric, 6.28::numeric, 25.13::numeric, 1630.5::numeric),
    ('stretch-film-15-x-70-ga-x-1500ft', 15::numeric, 70::numeric, 1500::numeric, 7.19::numeric, 28.75::numeric, 1862.0::numeric),
    ('stretch-film-15-x-80-ga-x-1500ft', 15::numeric, 80::numeric, 1500::numeric, 8.09::numeric, 32.36::numeric, 2093.3::numeric)
) AS spec(slug, width_in, gauge, length_ft, roll_lbs, box_lbs, pallet_lbs)
  ON p.slug = spec.slug
  OR (
    ROUND(p.width_inches::numeric) = spec.width_in
    AND ROUND(p.gauge::numeric) = spec.gauge
    AND ROUND(p.length_feet::numeric) = spec.length_ft
  )
WHERE v.product_id = p.id;

-- Package total, when product_variants.weight_lbs exists.
-- Full pallet tiers use the spec pallet weight (film + wooden pallet).
-- Smaller tiers use roll count × official roll weight.
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
      WHEN COALESCE(v.boxes_count, 0) >= 64 OR COALESCE(v.rolls_count, 0) >= 256
        THEN spec.pallet_lbs
      WHEN COALESCE(v.rolls_count, 0) > 0
        THEN ROUND(spec.roll_lbs * v.rolls_count, 2)
      ELSE spec.box_lbs
    END
    FROM public.products AS p
    JOIN (
      VALUES
        ('stretch-film-18-x-60-ga-x-1000ft', 18::numeric, 60::numeric, 1000::numeric, 6.15::numeric, 24.60::numeric, 1596.7::numeric),
        ('stretch-film-18-x-70-ga-x-1000ft', 18::numeric, 70::numeric, 1000::numeric, 6.88::numeric, 27.51::numeric, 1783.0::numeric),
        ('stretch-film-18-x-80-ga-x-1000ft', 18::numeric, 80::numeric, 1000::numeric, 8.66::numeric, 34.65::numeric, 2240.2::numeric),
        ('stretch-film-18-x-60-ga-x-1500ft', 18::numeric, 60::numeric, 1500::numeric, 7.61::numeric, 30.42::numeric, 1969.2::numeric),
        ('stretch-film-18-x-70-ga-x-1500ft', 18::numeric, 70::numeric, 1500::numeric, 8.69::numeric, 34.74::numeric, 2245.8::numeric),
        ('stretch-film-18-x-80-ga-x-1500ft', 18::numeric, 80::numeric, 1500::numeric, 9.77::numeric, 39.07::numeric, 2522.3::numeric),
        ('stretch-film-15-x-40-ga-x-1500ft', 15::numeric, 40::numeric, 1500::numeric, 4.50::numeric, 18.00::numeric, 1173.5::numeric),
        ('stretch-film-15-x-60-ga-x-1000ft', 15::numeric, 60::numeric, 1000::numeric, 5.42::numeric, 21.69::numeric, 1410.3::numeric),
        ('stretch-film-15-x-60-ga-x-1500ft', 15::numeric, 60::numeric, 1500::numeric, 6.28::numeric, 25.13::numeric, 1630.5::numeric),
        ('stretch-film-15-x-70-ga-x-1500ft', 15::numeric, 70::numeric, 1500::numeric, 7.19::numeric, 28.75::numeric, 1862.0::numeric),
        ('stretch-film-15-x-80-ga-x-1500ft', 15::numeric, 80::numeric, 1500::numeric, 8.09::numeric, 32.36::numeric, 2093.3::numeric)
    ) AS spec(slug, width_in, gauge, length_ft, roll_lbs, box_lbs, pallet_lbs)
      ON p.slug = spec.slug
      OR (
        ROUND(p.width_inches::numeric) = spec.width_in
        AND ROUND(p.gauge::numeric) = spec.gauge
        AND ROUND(p.length_feet::numeric) = spec.length_ft
      )
    WHERE v.product_id = p.id;
  END IF;
END $$;

-- Automated machine film, 20" rolls. Half and full pallet include the 22.05 lb wooden pallet.
-- 1 roll is the sellable unit, so box_weight_lbs stores that single-roll weight.

UPDATE public.products AS p
SET
  roll_weight_lbs = spec.roll_lbs,
  pallet_weight_lbs = spec.pallet_lbs
FROM (
  VALUES
    ('stretch-film-20-x-51-ga-x-7000ft', 20::numeric, 51::numeric, 7000::numeric, 30.60::numeric, 1246.1::numeric),
    ('stretch-film-20-x-51-ga-x-9000ft', 20::numeric, 51::numeric, 9000::numeric, 38.78::numeric, 1573.3::numeric),
    ('stretch-film-20-x-70-ga-x-5000ft', 20::numeric, 70::numeric, 5000::numeric, 30.05::numeric, 1224.1::numeric),
    ('stretch-film-20-x-80-ga-x-5000ft', 20::numeric, 80::numeric, 5000::numeric, 34.06::numeric, 1384.5::numeric)
) AS spec(slug, width_in, gauge, length_ft, roll_lbs, pallet_lbs)
WHERE p.slug = spec.slug
   OR (
     ROUND(p.width_inches::numeric) = spec.width_in
     AND ROUND(p.gauge::numeric) = spec.gauge
     AND ROUND(p.length_feet::numeric) = spec.length_ft
   );

UPDATE public.product_variants AS v
SET
  roll_weight_lbs = spec.roll_lbs,
  box_weight_lbs = spec.roll_lbs,
  pallet_weight_lbs = spec.pallet_lbs
FROM public.products AS p
JOIN (
  VALUES
    ('stretch-film-20-x-51-ga-x-7000ft', 20::numeric, 51::numeric, 7000::numeric, 30.60::numeric, 1246.1::numeric),
    ('stretch-film-20-x-51-ga-x-9000ft', 20::numeric, 51::numeric, 9000::numeric, 38.78::numeric, 1573.3::numeric),
    ('stretch-film-20-x-70-ga-x-5000ft', 20::numeric, 70::numeric, 5000::numeric, 30.05::numeric, 1224.1::numeric),
    ('stretch-film-20-x-80-ga-x-5000ft', 20::numeric, 80::numeric, 5000::numeric, 34.06::numeric, 1384.5::numeric)
) AS spec(slug, width_in, gauge, length_ft, roll_lbs, pallet_lbs)
  ON p.slug = spec.slug
  OR (
    ROUND(p.width_inches::numeric) = spec.width_in
    AND ROUND(p.gauge::numeric) = spec.gauge
    AND ROUND(p.length_feet::numeric) = spec.length_ft
  )
WHERE v.product_id = p.id;

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
      WHEN COALESCE(v.rolls_count, 0) >= 40 THEN spec.pallet_lbs
      WHEN COALESCE(v.rolls_count, 0) = 20 THEN ROUND(spec.roll_lbs * 20 + 22.05, 1)
      ELSE spec.roll_lbs
    END
    FROM public.products AS p
    JOIN (
      VALUES
        ('stretch-film-20-x-51-ga-x-7000ft', 20::numeric, 51::numeric, 7000::numeric, 30.60::numeric, 1246.1::numeric),
        ('stretch-film-20-x-51-ga-x-9000ft', 20::numeric, 51::numeric, 9000::numeric, 38.78::numeric, 1573.3::numeric),
        ('stretch-film-20-x-70-ga-x-5000ft', 20::numeric, 70::numeric, 5000::numeric, 30.05::numeric, 1224.1::numeric),
        ('stretch-film-20-x-80-ga-x-5000ft', 20::numeric, 80::numeric, 5000::numeric, 34.06::numeric, 1384.5::numeric)
    ) AS spec(slug, width_in, gauge, length_ft, roll_lbs, pallet_lbs)
      ON p.slug = spec.slug
      OR (
        ROUND(p.width_inches::numeric) = spec.width_in
        AND ROUND(p.gauge::numeric) = spec.gauge
        AND ROUND(p.length_feet::numeric) = spec.length_ft
      )
    WHERE v.product_id = p.id;
  END IF;
END $$;
