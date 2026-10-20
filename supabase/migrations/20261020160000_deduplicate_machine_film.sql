-- One active Machine Film product per official spec, in Automatic High Performance.
-- Extra rows for the same 20" x gauge x length are soft-hidden.
-- Hand film (12" / 15" / 18") is not modified.
-- Safe to re-run.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

WITH official(width_in, gauge, length_ft) AS (
  VALUES
    (20::numeric, 51::numeric, 7000::numeric),
    (20::numeric, 51::numeric, 9000::numeric),
    (20::numeric, 70::numeric, 5000::numeric),
    (20::numeric, 80::numeric, 5000::numeric)
),
machine_rows AS (
  SELECT
    p.id,
    ROUND(p.width_inches::numeric) AS width_in,
    ROUND(p.gauge::numeric) AS gauge,
    ROUND(p.length_feet::numeric) AS length_ft,
    ROW_NUMBER() OVER (
      PARTITION BY
        ROUND(p.width_inches::numeric),
        ROUND(p.gauge::numeric),
        ROUND(p.length_feet::numeric)
      ORDER BY
        CASE
          WHEN p.category_id::text IN (
            'fc93a79e-6549-4781-9a7d-009bc8bb27b0',
            'genesis-high-performance',
            'machine-high-yield-film'
          ) THEN 0
          ELSE 1
        END,
        CASE WHEN p.is_active IS TRUE THEN 0 ELSE 1 END,
        p.created_at ASC NULLS LAST,
        p.id ASC
    ) AS spec_rank
  FROM public.products AS p
  JOIN official AS spec
    ON ROUND(p.width_inches::numeric) = spec.width_in
   AND ROUND(p.gauge::numeric) = spec.gauge
   AND ROUND(p.length_feet::numeric) = spec.length_ft
  WHERE ROUND(COALESCE(p.width_inches, 0)::numeric) = 20
    AND lower(COALESCE(p.type::text, '')) NOT IN ('hand', 'manual')
    AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-15%'
    AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-18%'
    AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-12%'
)
UPDATE public.products AS p
SET is_active = (ranked.spec_rank = 1)
FROM machine_rows AS ranked
WHERE p.id = ranked.id;
