-- Keep only the master stretch-film specs visible.
-- Other catalog categories are left unchanged. Safe to re-run.
-- Storefront visibility is products.is_active. Package variants follow their product.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

WITH master(width_in, gauge, length_ft) AS (
  VALUES
    -- Manual 15 in
    (15::numeric, 40::numeric, 1500::numeric),
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

-- Force the authorized specs on by title, slug, or width/gauge/length.
-- Covers "15x70x1500", "15 x 70 x 1500", and "15\" x 70 x 1500".
UPDATE public.products
SET is_active = true
WHERE title ILIKE '%15%40%1500%'
   OR slug ILIKE '%15%40%1500%'
   OR title ILIKE '%15%60%1500%'
   OR slug ILIKE '%15%60%1500%'
   OR title ILIKE '%15%70%1500%'
   OR slug ILIKE '%15%70%1500%'
   OR title ILIKE '%15%80%1500%'
   OR slug ILIKE '%15%80%1500%'
   OR (
     ROUND(width_inches::numeric) = 15
     AND ROUND(gauge::numeric) IN (40, 60, 70, 80)
     AND ROUND(length_feet::numeric) = 1500
   )
   OR title ILIKE '%18%60%1000%'
   OR slug ILIKE '%18%60%1000%'
   OR title ILIKE '%18%60%1500%'
   OR slug ILIKE '%18%60%1500%'
   OR title ILIKE '%18%70%1000%'
   OR slug ILIKE '%18%70%1000%'
   OR title ILIKE '%18%70%1500%'
   OR slug ILIKE '%18%70%1500%'
   OR title ILIKE '%18%80%1000%'
   OR slug ILIKE '%18%80%1000%'
   OR title ILIKE '%18%80%1500%'
   OR slug ILIKE '%18%80%1500%'
   OR (
     ROUND(width_inches::numeric) = 18
     AND (
       (ROUND(gauge::numeric) = 60 AND ROUND(length_feet::numeric) IN (1000, 1500))
       OR (ROUND(gauge::numeric) = 70 AND ROUND(length_feet::numeric) IN (1000, 1500))
       OR (ROUND(gauge::numeric) = 80 AND ROUND(length_feet::numeric) IN (1000, 1500))
     )
   )
   OR title ILIKE '%20%51%7000%'
   OR slug ILIKE '%20%51%7000%'
   OR title ILIKE '%20%51%9000%'
   OR slug ILIKE '%20%51%9000%'
   OR title ILIKE '%20%70%5000%'
   OR slug ILIKE '%20%70%5000%'
   OR title ILIKE '%20%80%5000%'
   OR slug ILIKE '%20%80%5000%'
   OR (
     ROUND(width_inches::numeric) = 20
     AND (
       (ROUND(gauge::numeric) = 51 AND ROUND(length_feet::numeric) IN (7000, 9000))
       OR (ROUND(gauge::numeric) = 70 AND ROUND(length_feet::numeric) = 5000)
       OR (ROUND(gauge::numeric) = 80 AND ROUND(length_feet::numeric) = 5000)
     )
   );

-- Force every 15" stretch film active, including text widths such as 15".
UPDATE public.products
SET is_active = true
WHERE title ILIKE '%15%'
   OR slug ILIKE '%15%'
   OR CAST(width_inches AS text) ILIKE '%15%';
