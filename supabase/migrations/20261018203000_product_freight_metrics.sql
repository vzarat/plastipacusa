-- Official roll, box, and full-pallet weights, stored unrounded.
-- Hand full pallets are 78 in. Automatic full pallets are 46 in.
-- Safe to re-run. Does not change package prices.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS roll_weight_lbs numeric(8, 2),
  ADD COLUMN IF NOT EXISTS box_weight_lbs numeric(8, 2),
  ADD COLUMN IF NOT EXISTS pallet_weight_lbs numeric(8, 2),
  ADD COLUMN IF NOT EXISTS pallet_height_in numeric(6, 2);

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS roll_weight_lbs numeric(8, 2),
  ADD COLUMN IF NOT EXISTS box_weight_lbs numeric(8, 2),
  ADD COLUMN IF NOT EXISTS pallet_weight_lbs numeric(8, 2);

UPDATE public.products AS p
SET
  roll_weight_lbs = spec.roll_lbs,
  pallet_weight_lbs = spec.pallet_lbs,
  pallet_height_in = 78,
  pallet_dimensions = '48 x 48 x 78'
FROM (
  VALUES
    ('stretch-film-18-x-60-ga-x-1000ft', 18::numeric, 60::numeric, 1000::numeric, 6.15::numeric, 1416.88::numeric),
    ('stretch-film-18-x-70-ga-x-1000ft', 18::numeric, 70::numeric, 1000::numeric, 6.88::numeric, 1789.82::numeric),
    ('stretch-film-18-x-80-ga-x-1000ft', 18::numeric, 80::numeric, 1000::numeric, 8.66::numeric, 2240.2::numeric),
    ('stretch-film-18-x-60-ga-x-1500ft', 18::numeric, 60::numeric, 1500::numeric, 7.61::numeric, 1973.00::numeric),
    ('stretch-film-18-x-70-ga-x-1500ft', 18::numeric, 70::numeric, 1500::numeric, 8.69::numeric, 2252.54::numeric),
    ('stretch-film-18-x-80-ga-x-1500ft', 18::numeric, 80::numeric, 1500::numeric, 9.77::numeric, 2525.13::numeric),
    ('stretch-film-15-x-40-ga-x-1500ft', 15::numeric, 40::numeric, 1500::numeric, 4.50::numeric, 1175.74::numeric),
    ('stretch-film-15-x-60-ga-x-1000ft', 15::numeric, 60::numeric, 1000::numeric, 5.42::numeric, 1637.50::numeric),
    ('stretch-film-15-x-60-ga-x-1500ft', 15::numeric, 60::numeric, 1500::numeric, 6.28::numeric, 1630.5::numeric),
    ('stretch-film-15-x-70-ga-x-1500ft', 15::numeric, 70::numeric, 1500::numeric, 7.19::numeric, 1869.18::numeric),
    ('stretch-film-15-x-80-ga-x-1500ft', 15::numeric, 80::numeric, 1500::numeric, 8.09::numeric, 2093.3::numeric)
) AS spec(slug, width_in, gauge, length_ft, roll_lbs, pallet_lbs)
WHERE p.slug = spec.slug
   OR (
     ROUND(p.width_inches::numeric) = spec.width_in
     AND ROUND(p.gauge::numeric) = spec.gauge
     AND ROUND(p.length_feet::numeric) = spec.length_ft
     AND lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
   );

UPDATE public.product_variants AS v
SET
  roll_weight_lbs = spec.roll_lbs,
  box_weight_lbs = spec.box_lbs,
  pallet_weight_lbs = spec.pallet_lbs
FROM public.products AS p
JOIN (
  VALUES
    ('stretch-film-18-x-60-ga-x-1000ft', 18::numeric, 60::numeric, 1000::numeric, 6.15::numeric, 21.68::numeric, 1416.88::numeric),
    ('stretch-film-18-x-70-ga-x-1000ft', 18::numeric, 70::numeric, 1000::numeric, 6.88::numeric, 27.51::numeric, 1789.82::numeric),
    ('stretch-film-18-x-80-ga-x-1000ft', 18::numeric, 80::numeric, 1000::numeric, 8.66::numeric, 34.65::numeric, 2240.2::numeric),
    ('stretch-film-18-x-60-ga-x-1500ft', 18::numeric, 60::numeric, 1500::numeric, 7.61::numeric, 30.37::numeric, 1973.00::numeric),
    ('stretch-film-18-x-70-ga-x-1500ft', 18::numeric, 70::numeric, 1500::numeric, 8.69::numeric, 34.74::numeric, 2252.54::numeric),
    ('stretch-film-18-x-80-ga-x-1500ft', 18::numeric, 80::numeric, 1500::numeric, 9.77::numeric, 40.06::numeric, 2525.13::numeric),
    ('stretch-film-15-x-40-ga-x-1500ft', 15::numeric, 40::numeric, 1500::numeric, 4.50::numeric, 18.00::numeric, 1175.74::numeric),
    ('stretch-film-15-x-60-ga-x-1000ft', 15::numeric, 60::numeric, 1000::numeric, 5.42::numeric, 25.13::numeric, 1637.50::numeric),
    ('stretch-film-15-x-60-ga-x-1500ft', 15::numeric, 60::numeric, 1500::numeric, 6.28::numeric, 25.13::numeric, 1630.5::numeric),
    ('stretch-film-15-x-70-ga-x-1500ft', 15::numeric, 70::numeric, 1500::numeric, 7.19::numeric, 28.75::numeric, 1869.18::numeric),
    ('stretch-film-15-x-80-ga-x-1500ft', 15::numeric, 80::numeric, 1500::numeric, 8.09::numeric, 32.36::numeric, 2093.3::numeric)
) AS spec(slug, width_in, gauge, length_ft, roll_lbs, box_lbs, pallet_lbs)
  ON p.slug = spec.slug
  OR (
    ROUND(p.width_inches::numeric) = spec.width_in
    AND ROUND(p.gauge::numeric) = spec.gauge
    AND ROUND(p.length_feet::numeric) = spec.length_ft
    AND lower(COALESCE(p.type::text, '')) NOT IN ('machine', 'automatic')
  )
WHERE v.product_id = p.id;

UPDATE public.products AS p
SET
  roll_weight_lbs = spec.roll_lbs,
  pallet_weight_lbs = spec.pallet_lbs,
  pallet_height_in = 46,
  pallet_dimensions = '48 x 48 x 46'
FROM (
  VALUES
    ('stretch-film-20-x-51-ga-x-7000ft', 20::numeric, 51::numeric, 7000::numeric, 30.60::numeric, 1246.1::numeric),
    ('stretch-film-20-x-51-ga-x-9000ft', 20::numeric, 51::numeric, 9000::numeric, 38.78::numeric, 1573.3::numeric),
    ('stretch-film-20-x-60-ga-x-5000ft', 20::numeric, 60::numeric, 5000::numeric, 25.90::numeric, 1058.0::numeric),
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
  box_weight_lbs = NULL,
  pallet_weight_lbs = spec.pallet_lbs
FROM public.products AS p
JOIN (
  VALUES
    ('stretch-film-20-x-51-ga-x-7000ft', 20::numeric, 51::numeric, 7000::numeric, 30.60::numeric, 1246.1::numeric),
    ('stretch-film-20-x-51-ga-x-9000ft', 20::numeric, 51::numeric, 9000::numeric, 38.78::numeric, 1573.3::numeric),
    ('stretch-film-20-x-60-ga-x-5000ft', 20::numeric, 60::numeric, 5000::numeric, 25.90::numeric, 1058.0::numeric),
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
