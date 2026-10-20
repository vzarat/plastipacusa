-- Keep only these four Machine / Automatic film specs active on the storefront:
--   20" x 51 Ga x 7,000 ft
--   20" x 51 Ga x 9,000 ft
--   20" x 70 Ga x 5,000 ft
--   20" x 80 Ga x 5,000 ft
-- All other Machine film products are soft-hidden (is_active = false).
-- Hand film (15" / 18" FORCE, etc.) is not modified.
-- Safe to re-run.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Activate the four official machine specs.
UPDATE public.products AS p
SET is_active = true
WHERE (
    ROUND(COALESCE(p.width_inches, 0)::numeric) = 20
    OR lower(COALESCE(p.type::text, '')) IN ('machine', 'automatic')
    OR COALESCE(p.slug, '') ILIKE 'stretch-film-20%'
    OR COALESCE(p.slug, '') ILIKE '%-20-x-%'
    OR COALESCE(p.title, '') ILIKE '%20"%'
  )
  AND (
    (
      ROUND(p.width_inches::numeric) = 20
      AND ROUND(p.gauge::numeric) = 51
      AND ROUND(p.length_feet::numeric) IN (7000, 9000)
    )
    OR (
      ROUND(p.width_inches::numeric) = 20
      AND ROUND(p.gauge::numeric) = 70
      AND ROUND(p.length_feet::numeric) = 5000
    )
    OR (
      ROUND(p.width_inches::numeric) = 20
      AND ROUND(p.gauge::numeric) = 80
      AND ROUND(p.length_feet::numeric) = 5000
    )
    OR COALESCE(p.slug, '') ILIKE '%20%51%7000%'
    OR COALESCE(p.slug, '') ILIKE '%20%51%9000%'
    OR COALESCE(p.slug, '') ILIKE '%20%70%5000%'
    OR COALESCE(p.slug, '') ILIKE '%20%80%5000%'
    OR COALESCE(p.title, '') ILIKE '%20%51%7000%'
    OR COALESCE(p.title, '') ILIKE '%20%51%9000%'
    OR COALESCE(p.title, '') ILIKE '%20%70%5000%'
    OR COALESCE(p.title, '') ILIKE '%20%80%5000%'
  );

-- Soft-hide every other machine / 20" automatic product.
UPDATE public.products AS p
SET is_active = false
WHERE (
    ROUND(COALESCE(p.width_inches, 0)::numeric) = 20
    OR lower(COALESCE(p.type::text, '')) IN ('machine', 'automatic')
    OR COALESCE(p.slug, '') ILIKE 'stretch-film-20%'
    OR COALESCE(p.category_id::text, '') IN (
      'b0000000-0000-0000-0000-000000000003',
      'fc93a79e-6549-4781-9a7d-009bc8bb27b0',
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
            'genesis-standard',
            'genesis-high-performance',
            'machine-high-yield-film'
          )
          OR c.slug ILIKE 'genesis%'
          OR c.name ILIKE '%machine%'
          OR c.name ILIKE '%automatic%'
        )
    )
  )
  -- Never touch hand film widths.
  AND ROUND(COALESCE(p.width_inches, 0)::numeric) NOT IN (12, 15, 18)
  AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-15%'
  AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-18%'
  AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-12%'
  AND lower(COALESCE(p.type::text, '')) NOT IN ('hand', 'manual')
  -- Keep the four official machine specs active.
  AND NOT (
    (
      ROUND(COALESCE(p.width_inches, 0)::numeric) = 20
      AND ROUND(COALESCE(p.gauge, 0)::numeric) = 51
      AND ROUND(COALESCE(p.length_feet, 0)::numeric) IN (7000, 9000)
    )
    OR (
      ROUND(COALESCE(p.width_inches, 0)::numeric) = 20
      AND ROUND(COALESCE(p.gauge, 0)::numeric) = 70
      AND ROUND(COALESCE(p.length_feet, 0)::numeric) = 5000
    )
    OR (
      ROUND(COALESCE(p.width_inches, 0)::numeric) = 20
      AND ROUND(COALESCE(p.gauge, 0)::numeric) = 80
      AND ROUND(COALESCE(p.length_feet, 0)::numeric) = 5000
    )
    OR COALESCE(p.slug, '') ILIKE '%20-x-51-ga-x-7000%'
    OR COALESCE(p.slug, '') ILIKE '%20-x-51-ga-x-9000%'
    OR COALESCE(p.slug, '') ILIKE '%20-x-70-ga-x-5000%'
    OR COALESCE(p.slug, '') ILIKE '%20-x-80-ga-x-5000%'
  );
