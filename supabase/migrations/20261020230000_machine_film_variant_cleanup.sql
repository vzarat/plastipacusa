-- Machine film cleanup. Each official spec keeps exactly two variants:
--   HPF-SF205170-HLP / HPF-SF205170-FLP
--   HPF-SF205190-HLP / HPF-SF205190-FLP
--   HPF-SF207050-HLP / HPF-SF207050-FLP
--   HPF-SF208050-HLP / HPF-SF208050-FLP
-- Deletes GEN-% plus leftover -1R, -6R, -12R, -24R, and -36R rows.
-- Deletes variants for non-official machine measurements such as 60 GA and 6,000 ft.
-- boxes_count is 0. Hand film is not changed.
-- Run this whole file, from DO $$ through the final SELECT.

DO $$
BEGIN
  ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

  CREATE TEMP TABLE official_machine (
    width_in integer,
    gauge integer,
    length_ft integer,
    slug text,
    base_sku text,
    product_id uuid
  ) ON COMMIT DROP;

  INSERT INTO official_machine (width_in, gauge, length_ft, slug, base_sku)
  VALUES
    (20, 51, 7000, 'stretch-film-20-x-51-ga-x-7000ft', 'HPF-SF205170'),
    (20, 51, 9000, 'stretch-film-20-x-51-ga-x-9000ft', 'HPF-SF205190'),
    (20, 70, 5000, 'stretch-film-20-x-70-ga-x-5000ft', 'HPF-SF207050'),
    (20, 80, 5000, 'stretch-film-20-x-80-ga-x-5000ft', 'HPF-SF208050');

  UPDATE official_machine AS chosen
  SET product_id = picked.id
  FROM (
    SELECT DISTINCT ON (o.base_sku)
      o.base_sku,
      p.id
    FROM official_machine AS o
    JOIN public.products AS p
      ON ROUND(p.width_inches) = o.width_in
     AND ROUND(p.gauge) = o.gauge
     AND ROUND(p.length_feet) = o.length_ft
    WHERE COALESCE(p.slug, '') NOT ILIKE 'stretch-film-12%'
      AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-15%'
      AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-18%'
    ORDER BY
      o.base_sku,
      (p.slug = o.slug) DESC,
      CASE WHEN p.is_active IS TRUE THEN 0 ELSE 1 END,
      p.created_at ASC NULLS LAST,
      p.id
  ) AS picked
  WHERE chosen.base_sku = picked.base_sku;

  CREATE TEMP TABLE desired_tier ON COMMIT DROP AS
  SELECT DISTINCT ON (o.base_sku, tier.rolls)
    o.product_id,
    o.base_sku || CASE WHEN tier.rolls = 20 THEN '-HLP' ELSE '-FLP' END AS new_sku,
    tier.rolls,
    v.id AS variant_id
  FROM official_machine AS o
  CROSS JOIN (VALUES (20), (40)) AS tier(rolls)
  JOIN public.product_variants AS v ON TRUE
  JOIN public.products AS p ON p.id = v.product_id
  WHERE o.product_id IS NOT NULL
    AND (
      v.sku = o.base_sku || CASE WHEN tier.rolls = 20 THEN '-HLP' ELSE '-FLP' END
      OR (
        ROUND(p.width_inches) = o.width_in
        AND ROUND(p.gauge) = o.gauge
        AND ROUND(p.length_feet) = o.length_ft
        AND (
          COALESCE(v.rolls_count, 0) = tier.rolls
          OR v.sku ~* CASE
            WHEN tier.rolls = 20 THEN '-(hlp|20r)$'
            ELSE '-(flp|40r)$'
          END
        )
      )
    )
  ORDER BY
    o.base_sku,
    tier.rolls,
    (v.sku = o.base_sku || CASE WHEN tier.rolls = 20 THEN '-HLP' ELSE '-FLP' END) DESC,
    (v.product_id = o.product_id) DESC,
    v.id;

  UPDATE public.product_variants AS v
  SET
    product_id = d.product_id,
    rolls_count = d.rolls,
    boxes_count = 0
  FROM desired_tier AS d
  WHERE v.sku = d.new_sku;

  UPDATE public.product_variants AS v
  SET
    sku = d.new_sku,
    product_id = d.product_id,
    rolls_count = d.rolls,
    boxes_count = 0
  FROM desired_tier AS d
  WHERE v.id = d.variant_id
    AND v.sku IS DISTINCT FROM d.new_sku
    AND NOT EXISTS (
      SELECT 1
      FROM public.product_variants AS other
      WHERE other.sku = d.new_sku
        AND other.id <> v.id
    );

  DELETE FROM public.product_variants AS v
  USING public.products AS p
  WHERE v.product_id = p.id
    AND (
      v.sku ILIKE 'GEN-%'
      OR (
        ROUND(p.width_inches) = 20
        AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-12%'
        AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-15%'
        AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-18%'
        AND lower(COALESCE(p.type, '')) NOT IN ('hand', 'manual')
        AND (
          v.sku ~* '-(1|6|12|24|36)r$'
          OR NOT EXISTS (
            SELECT 1
            FROM official_machine AS o
            WHERE o.width_in = ROUND(p.width_inches)
              AND o.gauge = ROUND(p.gauge)
              AND o.length_ft = ROUND(p.length_feet)
              AND v.sku IN (o.base_sku || '-HLP', o.base_sku || '-FLP')
          )
        )
      )
    );

  UPDATE public.product_variants AS v
  SET boxes_count = 0
  FROM public.products AS p
  WHERE v.product_id = p.id
    AND ROUND(p.width_inches) = 20
    AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-12%'
    AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-15%'
    AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-18%'
    AND lower(COALESCE(p.type, '')) NOT IN ('hand', 'manual')
    AND v.boxes_count IS DISTINCT FROM 0;

  UPDATE public.products AS p
  SET
    part_number = o.base_sku,
    is_active = (p.id = o.product_id)
  FROM official_machine AS o
  WHERE ROUND(p.width_inches) = o.width_in
    AND ROUND(p.gauge) = o.gauge
    AND ROUND(p.length_feet) = o.length_ft
    AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-12%'
    AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-15%'
    AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-18%';

  UPDATE public.products AS p
  SET is_active = false
  WHERE ROUND(p.width_inches) = 20
    AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-12%'
    AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-15%'
    AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-18%'
    AND lower(COALESCE(p.type, '')) NOT IN ('hand', 'manual')
    AND NOT EXISTS (
      SELECT 1
      FROM official_machine AS o
      WHERE o.width_in = ROUND(p.width_inches)
        AND o.gauge = ROUND(p.gauge)
        AND o.length_ft = ROUND(p.length_feet)
    )
    AND p.is_active IS DISTINCT FROM false;
END $$;

SELECT p.slug, p.part_number, p.is_active, v.sku, v.rolls_count, v.boxes_count
FROM public.products AS p
LEFT JOIN public.product_variants AS v ON v.product_id = p.id
WHERE ROUND(p.width_inches) = 20
  AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-12%'
  AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-15%'
  AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-18%'
  AND lower(COALESCE(p.type, '')) NOT IN ('hand', 'manual')
ORDER BY p.slug, v.sku;
