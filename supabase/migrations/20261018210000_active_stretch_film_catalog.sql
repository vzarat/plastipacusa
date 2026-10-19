-- Keep only the master stretch-film specs visible.
-- Other catalog categories are left unchanged. Safe to re-run.
-- Storefront visibility is products.is_active. Package variants follow their product.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

WITH master(width_in, gauge, length_ft) AS (
  VALUES
    -- Manual 15 in
    (15::numeric, 60::numeric, 1500::numeric),
    (15::numeric, 70::numeric, 1500::numeric),
    (15::numeric, 80::numeric, 1500::numeric),
    -- Manual 18 in
    (18::numeric, 60::numeric, 1000::numeric),
    (18::numeric, 60::numeric, 1500::numeric),
    (18::numeric, 70::numeric, 1000::numeric),
    (18::numeric, 70::numeric, 1500::numeric),
    (18::numeric, 80::numeric, 1000::numeric),
    (18::numeric, 80::numeric, 1500::numeric),
    -- Automatic 20 in
    (20::numeric, 51::numeric, 7000::numeric),
    (20::numeric, 51::numeric, 9000::numeric),
    (20::numeric, 70::numeric, 5000::numeric),
    (20::numeric, 80::numeric, 5000::numeric)
)
UPDATE public.products AS p
SET is_active = EXISTS (
  SELECT 1
  FROM master AS spec
  WHERE ROUND(p.width_inches::numeric) = spec.width_in
    AND ROUND(p.gauge::numeric) = spec.gauge
    AND ROUND(p.length_feet::numeric) = spec.length_ft
)
WHERE p.slug ILIKE 'stretch-film%'
   OR COALESCE(p.title, '') ILIKE '%stretch film%'
   OR p.category_id::text IN (
     'a0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000002',
     'b0000000-0000-0000-0000-000000000003',
     'fc93a79e-6549-4781-9a7d-009bc8bb27b0',
     'force-standard',
     'force-elite',
     'genesis-standard',
     'genesis-high-performance',
     'machine-high-yield-film'
   )
   OR EXISTS (
     SELECT 1
     FROM public.categories AS c
     WHERE c.id::text = p.category_id::text
       AND (
         lower(c.slug) IN (
           'force-standard',
           'force-elite',
           'genesis-standard',
           'genesis-high-performance',
           'machine-high-yield-film'
         )
         OR c.slug ILIKE 'force%'
         OR c.slug ILIKE 'genesis%'
         OR c.name ILIKE '%stretch%'
       )
   );
