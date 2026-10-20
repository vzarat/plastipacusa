-- Full pallet for 20" x 80 GA x 5,000 ft is 1,288.51 lbs.
-- Live SKU is HPF-SF208050-FLP. HPFSF208050-FLP is accepted if it still exists.
-- Half pallet HPF-SF208050-HLP stays 707.28 lbs. Prices are not changed.

UPDATE public.product_variants
SET pallet_weight_lbs = 1288.51
WHERE sku IN ('HPF-SF208050-FLP', 'HPFSF208050-FLP');

UPDATE public.products
SET pallet_weight_lbs = 1288.51
WHERE slug = 'stretch-film-20-x-80-ga-x-5000ft'
   OR part_number IN ('HPF-SF208050', 'HPFSF208050');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_variants'
      AND column_name = 'weight_lbs'
  ) THEN
    UPDATE public.product_variants
    SET weight_lbs = 1288.51
    WHERE sku IN ('HPF-SF208050-FLP', 'HPFSF208050-FLP');
  END IF;
END $$;

SELECT sku, rolls_count, boxes_count, pallet_weight_lbs, price
FROM public.product_variants
WHERE sku IN (
  'HPF-SF208050-HLP',
  'HPF-SF208050-FLP',
  'HPFSF208050-HLP',
  'HPFSF208050-FLP'
)
ORDER BY rolls_count;
