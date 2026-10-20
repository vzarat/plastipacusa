-- Machine film SKUs: HPF-SF[WIDTH][GAUGE][LENGTH/100]-[HLP|FLP]
-- Hyphen between HPF and SF. No hyphen between SF and the measurement.
-- Renames HPFSF205190-HLP to HPF-SF205190-HLP, and the other
-- official automatic tiers the same way.
-- Run this whole file, from DO $$ through the final SELECT.
-- Hand film is not changed.
-- Re-runnable. A second run updates the existing SKU instead of raising 23505.

DO $$
DECLARE
  row_var record;
  next_sku text;
  next_rolls integer;
  width_in integer;
  gauge_in integer;
  length_ft integer;
  parsed text[];
BEGIN
  CREATE TEMP TABLE machine_film_sku_map (
    variant_id uuid,
    product_id uuid,
    new_sku text,
    base_sku text,
    rolls integer
  ) ON COMMIT DROP;

  FOR row_var IN
    SELECT
      v.id,
      v.product_id,
      v.sku,
      v.rolls_count,
      ROUND(p.width_inches)::int AS width_inches,
      ROUND(p.gauge)::int AS gauge,
      ROUND(p.length_feet)::int AS length_feet,
      p.slug
    FROM public.product_variants AS v
    JOIN public.products AS p ON p.id = v.product_id
  LOOP
    width_in := NULL;
    gauge_in := NULL;
    length_ft := NULL;
    next_rolls := NULL;
    parsed := regexp_match(
      row_var.sku,
      'genesis-machine-film-([0-9]+)-([0-9]+)-([0-9]+)-(20|40)r',
      'i'
    );
    IF parsed IS NOT NULL THEN
      width_in := parsed[1]::int;
      gauge_in := parsed[2]::int;
      length_ft := parsed[3]::int;
      next_rolls := parsed[4]::int;
    END IF;

    IF parsed IS NULL THEN
      parsed := regexp_match(row_var.sku, 'fst-([0-9]{2})([0-9]{2})([0-9]{4,5})-(20|40)r', 'i');
      IF parsed IS NOT NULL THEN
        width_in := parsed[1]::int;
        gauge_in := parsed[2]::int;
        length_ft := parsed[3]::int;
        next_rolls := parsed[4]::int;
      END IF;
    END IF;

    IF parsed IS NULL THEN
      parsed := regexp_match(row_var.sku, 'hpf-?sf([0-9]{2})([0-9]{2})([0-9]{2})-(hlp|flp)', 'i');
      IF parsed IS NOT NULL THEN
        width_in := parsed[1]::int;
        gauge_in := parsed[2]::int;
        length_ft := parsed[3]::int * 100;
        next_rolls := CASE WHEN lower(parsed[4]) = 'hlp' THEN 20 ELSE 40 END;
      END IF;
    END IF;

    IF width_in IS NULL THEN
      parsed := regexp_match(row_var.sku, 'gen-([0-9]{2})([0-9]{2})([0-9]{2})-(20|40)r', 'i');
      IF parsed IS NOT NULL THEN
        width_in := parsed[1]::int;
        gauge_in := parsed[2]::int;
        length_ft := parsed[3]::int * 100;
        next_rolls := parsed[4]::int;
      END IF;
    END IF;

    IF width_in IS NULL
      AND row_var.slug IN (
        'stretch-film-20-x-51-ga-x-7000ft',
        'stretch-film-20-x-51-ga-x-9000ft',
        'stretch-film-20-x-70-ga-x-5000ft',
        'stretch-film-20-x-80-ga-x-5000ft'
      )
      AND (
        COALESCE(row_var.rolls_count, 0) IN (20, 40)
        OR row_var.sku ~* '-(20|40)r$'
        OR row_var.sku ~* '-(hlp|flp)$'
      )
    THEN
      width_in := row_var.width_inches;
      gauge_in := row_var.gauge;
      length_ft := row_var.length_feet;
      next_rolls := CASE
        WHEN COALESCE(row_var.rolls_count, 0) = 40 OR row_var.sku ~* '-(40r|flp)$' THEN 40
        ELSE 20
      END;
    END IF;

    IF width_in IS NULL OR next_rolls NOT IN (20, 40) THEN
      CONTINUE;
    END IF;

    IF NOT (
      (width_in = 20 AND gauge_in = 51 AND length_ft IN (7000, 9000))
      OR (width_in = 20 AND gauge_in = 70 AND length_ft = 5000)
      OR (width_in = 20 AND gauge_in = 80 AND length_ft = 5000)
    ) THEN
      CONTINUE;
    END IF;

    next_sku :=
      'HPF-SF'
      || lpad(width_in::text, 2, '0')
      || lpad(gauge_in::text, 2, '0')
      || lpad((length_ft / 100)::text, 2, '0')
      || CASE WHEN next_rolls = 20 THEN '-HLP' ELSE '-FLP' END;

    INSERT INTO machine_film_sku_map (variant_id, product_id, new_sku, base_sku, rolls)
    VALUES (
      row_var.id,
      row_var.product_id,
      next_sku,
      left(next_sku, length(next_sku) - 4),
      next_rolls
    );
  END LOOP;

  UPDATE public.product_variants AS v
  SET
    sku = m.new_sku,
    rolls_count = m.rolls,
    boxes_count = 0
  FROM (
    SELECT DISTINCT ON (new_sku)
      variant_id,
      new_sku,
      rolls
    FROM machine_film_sku_map
    ORDER BY new_sku, variant_id
  ) AS m
  WHERE v.id = m.variant_id
    AND v.sku IS DISTINCT FROM m.new_sku
    AND NOT EXISTS (
      SELECT 1
      FROM public.product_variants AS other
      WHERE other.sku = m.new_sku
        AND other.id <> v.id
    );

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
      CASE m.rolls
        WHEN 20 THEN 'Half Pallet (20 Rolls)'
        ELSE 'Full Pallet (40 Rolls)'
      END
    ),
    0,
    m.rolls,
    v.price,
    v.roll_weight_lbs,
    NULL,
    v.pallet_weight_lbs
  FROM machine_film_sku_map AS m
  JOIN public.product_variants AS v ON v.id = m.variant_id
  WHERE v.price IS NOT NULL
  ORDER BY m.new_sku, (v.sku = m.new_sku) DESC, v.id
  ON CONFLICT (sku) DO UPDATE SET
    product_id = EXCLUDED.product_id,
    title = COALESCE(NULLIF(btrim(product_variants.title), ''), EXCLUDED.title),
    boxes_count = 0,
    rolls_count = EXCLUDED.rolls_count,
    price = COALESCE(EXCLUDED.price, product_variants.price),
    roll_weight_lbs = COALESCE(EXCLUDED.roll_weight_lbs, product_variants.roll_weight_lbs),
    box_weight_lbs = NULL,
    pallet_weight_lbs = COALESCE(EXCLUDED.pallet_weight_lbs, product_variants.pallet_weight_lbs);

  DELETE FROM public.product_variants AS v
  USING machine_film_sku_map AS m
  WHERE v.id = m.variant_id
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
    FROM machine_film_sku_map
  ) AS m
  WHERE p.id = m.product_id
    AND p.part_number IS DISTINCT FROM m.base_sku;
END $$;

SELECT p.slug, p.part_number, v.sku, v.rolls_count, v.boxes_count
FROM public.product_variants AS v
JOIN public.products AS p ON p.id = v.product_id
WHERE p.slug IN (
    'stretch-film-20-x-51-ga-x-7000ft',
    'stretch-film-20-x-51-ga-x-9000ft',
    'stretch-film-20-x-70-ga-x-5000ft',
    'stretch-film-20-x-80-ga-x-5000ft'
  )
  OR v.sku ILIKE 'HPF-SF%'
  OR v.sku ILIKE 'HPFSF%'
  OR v.sku ILIKE 'genesis-machine-film-20-%'
  OR v.sku ILIKE 'FST-205%'
  OR v.sku ILIKE 'FST-207%'
  OR v.sku ILIKE 'FST-208%'
  OR v.sku ILIKE 'GEN-208%'
ORDER BY p.slug, v.sku;
