-- Automatic 20" film is sold by the roll. There are no boxes.
-- Half pallet = 20 rolls. Full pallet = 40 rolls.
-- product_variants.price is the pallet total (per-roll price × rolls)
-- because checkout multiplies that price by the number of pallets.
--
-- 20 x 51 x 7,000: $50.84 / roll half, $42.53 / roll full
-- 20 x 51 x 9,000: $64.16 / roll half, $54.39 / roll full
-- 20 x 70 x 5,000: $49.93 / roll half, $41.71 / roll full
-- 20 x 80 x 5,000 (15.45 lb price-sheet film): $56.46 / roll half, $47.53 / roll full
-- Scale weights are not changed.
-- Run this whole statement.

UPDATE public.product_variants AS v
SET
  boxes_count = 0,
  title = CASE
    WHEN v.rolls_count >= 40 THEN 'Full Pallet (40 Rolls)'
    ELSE 'Half Pallet (20 Rolls)'
  END,
  price = CASE
    WHEN p.part_number IN ('HPF-SF205170', 'HPFSF205170') AND v.rolls_count = 20 THEN 1016.80
    WHEN p.part_number IN ('HPF-SF205170', 'HPFSF205170') AND v.rolls_count >= 40 THEN 1701.20
    WHEN p.part_number IN ('HPF-SF205190', 'HPFSF205190') AND v.rolls_count = 20 THEN 1283.20
    WHEN p.part_number IN ('HPF-SF205190', 'HPFSF205190') AND v.rolls_count >= 40 THEN 2175.60
    WHEN p.part_number IN ('HPF-SF207050', 'HPFSF207050') AND v.rolls_count = 20 THEN 998.60
    WHEN p.part_number IN ('HPF-SF207050', 'HPFSF207050') AND v.rolls_count >= 40 THEN 1668.40
    WHEN p.part_number IN ('HPF-SF208050', 'HPFSF208050') AND v.rolls_count = 20 THEN 1129.20
    WHEN p.part_number IN ('HPF-SF208050', 'HPFSF208050') AND v.rolls_count >= 40 THEN 1901.20
    WHEN v.sku IN ('HPF-SF205170-HLP', 'HPFSF205170-HLP') THEN 1016.80
    WHEN v.sku IN ('HPF-SF205170-FLP', 'HPFSF205170-FLP') THEN 1701.20
    WHEN v.sku IN ('HPF-SF205190-HLP', 'HPFSF205190-HLP') THEN 1283.20
    WHEN v.sku IN ('HPF-SF205190-FLP', 'HPFSF205190-FLP') THEN 2175.60
    WHEN v.sku IN ('HPF-SF207050-HLP', 'HPFSF207050-HLP') THEN 998.60
    WHEN v.sku IN ('HPF-SF207050-FLP', 'HPFSF207050-FLP') THEN 1668.40
    WHEN v.sku IN ('HPF-SF208050-HLP', 'HPFSF208050-HLP') THEN 1129.20
    WHEN v.sku IN ('HPF-SF208050-FLP', 'HPFSF208050-FLP') THEN 1901.20
    ELSE v.price
  END
FROM public.products AS p
WHERE v.product_id = p.id
  AND v.rolls_count IN (20, 40)
  AND (
    p.part_number IN (
      'HPF-SF205170', 'HPFSF205170',
      'HPF-SF205190', 'HPFSF205190',
      'HPF-SF207050', 'HPFSF207050',
      'HPF-SF208050', 'HPFSF208050'
    )
    OR v.sku IN (
      'HPF-SF205170-HLP', 'HPF-SF205170-FLP',
      'HPF-SF205190-HLP', 'HPF-SF205190-FLP',
      'HPF-SF207050-HLP', 'HPF-SF207050-FLP',
      'HPF-SF208050-HLP', 'HPF-SF208050-FLP',
      'HPFSF205170-HLP', 'HPFSF205170-FLP',
      'HPFSF205190-HLP', 'HPFSF205190-FLP',
      'HPFSF207050-HLP', 'HPFSF207050-FLP',
      'HPFSF208050-HLP', 'HPFSF208050-FLP'
    )
  );

SELECT
  p.part_number,
  p.slug,
  v.sku,
  v.rolls_count,
  v.boxes_count,
  v.price,
  ROUND(v.price / NULLIF(v.rolls_count, 0), 2) AS price_per_roll
FROM public.product_variants AS v
JOIN public.products AS p ON p.id = v.product_id
WHERE v.sku IN (
  'HPF-SF205170-HLP', 'HPF-SF205170-FLP',
  'HPF-SF205190-HLP', 'HPF-SF205190-FLP',
  'HPF-SF207050-HLP', 'HPF-SF207050-FLP',
  'HPF-SF208050-HLP', 'HPF-SF208050-FLP'
)
ORDER BY p.part_number, v.rolls_count;
