-- Hand film SKUs: [QUALITY]SF[WIDTH][GAUGE][LENGTH/100]-[BOXES]B
-- STD = Standard, ELT = Elite, HPF = High Performance.
-- Hyphen between the quality and SF. No hyphen between SF and the measurement.
-- Example: STD-SF187015-32B.
-- 1B = 1 box, 16B = 16 boxes, 32B = 32 boxes, 64B = 64 boxes.
-- One statement, so the SQL editor cannot run a later step without the map.
-- Machine film (20 in / Genesis) is not changed.
-- Re-runnable. ON CONFLICT (sku) updates the existing row instead of raising 23505.

DO $$
BEGIN
  CREATE TEMP TABLE hand_film_sku_map ON COMMIT DROP AS
  SELECT
    v.id AS variant_id,
    p.id AS product_id,
    v.sku AS old_sku,
    CASE
      WHEN COALESCE(v.boxes_count, 0) IN (1, 16, 32, 64) THEN v.boxes_count
      WHEN COALESCE(v.rolls_count, 0) = 4 THEN 1
      WHEN COALESCE(v.rolls_count, 0) = 64 THEN 16
      WHEN COALESCE(v.rolls_count, 0) = 128 THEN 32
      WHEN COALESCE(v.rolls_count, 0) = 256 THEN 64
      WHEN v.sku ~* '-1B$' THEN 1
      WHEN v.sku ~* '-16B$' THEN 16
      WHEN v.sku ~* '-32B$' THEN 32
      WHEN v.sku ~* '-64B$' THEN 64
      ELSE NULL
    END AS boxes,
    CASE
      WHEN lower(COALESCE(c.slug, '')) = 'force-elite'
        OR lower(COALESCE(c.name, '')) LIKE '%elite%'
        OR COALESCE(p.part_number, '') ILIKE 'FEL%'
        OR COALESCE(p.part_number, '') ILIKE 'ELT%'
        OR COALESCE(p.title, '') ILIKE '%elite%'
        OR COALESCE(v.sku, '') ILIKE 'FEL%'
        OR COALESCE(v.sku, '') ILIKE 'ELT%'
        THEN 'ELT'
      WHEN (
          lower(COALESCE(c.slug, '')) LIKE '%high-performance%'
          OR lower(COALESCE(c.name, '')) LIKE '%high performance%'
          OR COALESCE(p.title, '') ILIKE '%high performance%'
          OR COALESCE(p.part_number, '') ILIKE 'HPF%'
        )
        AND lower(COALESCE(c.slug, '')) NOT LIKE 'genesis%'
        AND lower(COALESCE(p.type, '')) NOT LIKE '%machine%'
        AND lower(COALESCE(p.type, '')) NOT LIKE '%automatic%'
        THEN 'HPF'
      ELSE 'STD'
    END
      || '-SF'
      || lpad(ROUND(p.width_inches)::text, 2, '0')
      || lpad(ROUND(p.gauge)::text, 2, '0')
      || lpad((ROUND(p.length_feet)::int / 100)::text, 2, '0') AS base_sku,
    NULL::text AS new_sku
  FROM public.product_variants AS v
  JOIN public.products AS p ON p.id = v.product_id
  LEFT JOIN public.categories AS c ON c.id = p.category_id
  WHERE lower(COALESCE(p.type, '')) NOT LIKE '%machine%'
    AND lower(COALESCE(p.type, '')) NOT LIKE '%automatic%'
    AND lower(COALESCE(c.slug, '')) NOT LIKE 'genesis%'
    AND ROUND(p.width_inches) IN (15, 18)
    AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-20%';

  UPDATE hand_film_sku_map
  SET new_sku = base_sku || '-' || boxes::text || 'B'
  WHERE boxes IN (1, 16, 32, 64)
    AND base_sku IS NOT NULL;

  UPDATE public.product_variants AS v
  SET sku = m.new_sku
  FROM hand_film_sku_map AS m
  WHERE v.id = m.variant_id
    AND m.new_sku IS NOT NULL
    AND v.sku IS DISTINCT FROM m.new_sku
    AND NOT EXISTS (
      SELECT 1
      FROM public.product_variants AS other
      WHERE other.sku = m.new_sku
        AND other.id <> v.id
    );

  UPDATE hand_film_sku_map AS m
  SET old_sku = v.sku
  FROM public.product_variants AS v
  WHERE v.id = m.variant_id;

  INSERT INTO public.product_variants (
    product_id,
    sku,
    title,
    boxes_count,
    rolls_count,
    price,
    roll_weight_lbs,
    box_weight_lbs,
    pallet_weight_lbs
  )
  SELECT DISTINCT ON (m.new_sku)
    m.product_id,
    m.new_sku,
    COALESCE(
      NULLIF(btrim(v.title), ''),
      CASE m.boxes
        WHEN 1 THEN '1 BOX WITH 4 ROLLS'
        WHEN 16 THEN '16 BOXES = 64 ROLLS'
        WHEN 32 THEN '32 BOXES = 128 ROLLS'
        ELSE '64 BOXES = 256 ROLLS'
      END
    ),
    m.boxes,
    m.boxes * 4,
    v.price,
    v.roll_weight_lbs,
    v.box_weight_lbs,
    v.pallet_weight_lbs
  FROM hand_film_sku_map AS m
  JOIN public.product_variants AS v ON v.id = m.variant_id
  WHERE m.new_sku IS NOT NULL
    AND v.price IS NOT NULL
  ORDER BY m.new_sku, (v.sku = m.new_sku) DESC, v.id
  ON CONFLICT (sku) DO UPDATE SET
    product_id = EXCLUDED.product_id,
    title = COALESCE(NULLIF(btrim(product_variants.title), ''), EXCLUDED.title),
    boxes_count = EXCLUDED.boxes_count,
    rolls_count = EXCLUDED.rolls_count,
    price = COALESCE(EXCLUDED.price, product_variants.price),
    roll_weight_lbs = COALESCE(EXCLUDED.roll_weight_lbs, product_variants.roll_weight_lbs),
    box_weight_lbs = COALESCE(EXCLUDED.box_weight_lbs, product_variants.box_weight_lbs),
    pallet_weight_lbs = COALESCE(EXCLUDED.pallet_weight_lbs, product_variants.pallet_weight_lbs);

  DELETE FROM public.product_variants AS v
  USING hand_film_sku_map AS m
  WHERE v.id = m.variant_id
    AND m.new_sku IS NOT NULL
    AND v.sku IS DISTINCT FROM m.new_sku
    AND EXISTS (
      SELECT 1
      FROM public.product_variants AS canon
      WHERE canon.sku = m.new_sku
    );

  UPDATE public.products AS p
  SET part_number = m.base_sku
  FROM (
    SELECT DISTINCT product_id, base_sku
    FROM hand_film_sku_map
    WHERE new_sku IS NOT NULL
  ) AS m
  WHERE p.id = m.product_id
    AND p.part_number IS DISTINCT FROM m.base_sku;
END $$;
