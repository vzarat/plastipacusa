-- Restores the official machine-film tiers on the active products.
-- Fills every NOT NULL product_variants column that exists in this database.
-- price is taken from the parent product when that value is numeric, otherwise 0.00.
-- Existing non-zero prices are kept. boxes_count is 0. Hand film is not changed.
-- Run this whole file, from DO $$ through the final SELECT.

DO $$
DECLARE
  rec record;
  col_name text;
  expr text;
  col_list text := '';
  val_list text := '';
  set_list text := '';
BEGIN
  CREATE TEMP TABLE restore_tier (
    slug text,
    sku text,
    tier_title text,
    rolls integer,
    film_gauge integer,
    length_ft integer,
    roll_lbs numeric,
    pallet_lbs numeric,
    part_number text
  ) ON COMMIT DROP;

  INSERT INTO restore_tier (
    slug, sku, tier_title, rolls, film_gauge, length_ft, roll_lbs, pallet_lbs, part_number
  )
  VALUES
    ('genesis-machine-film-20-51-7000', 'HPF-SF205170-HLP', 'Half Pallet (20 Rolls)', 20, 51, 7000, 30.600162, 638.00, 'HPF-SF205170'),
    ('genesis-machine-film-20-51-7000', 'HPF-SF205170-FLP', 'Full Pallet (40 Rolls)', 40, 51, 7000, 30.600162, 1250.01, 'HPF-SF205170'),
    ('genesis-machine-film-20-51-9000', 'HPF-SF205190-HLP', 'Half Pallet (20 Rolls)', 20, 51, 9000, 38.779312, 802.13, 'HPF-SF205190'),
    ('genesis-machine-film-20-51-9000', 'HPF-SF205190-FLP', 'Full Pallet (40 Rolls)', 40, 51, 9000, 38.779312, 1577.71, 'HPF-SF205190'),
    ('stretch-film-20-x-70-ga-x-5000ft-std', 'HPF-SF207050-HLP', 'Half Pallet (20 Rolls)', 20, 70, 5000, 30.049006, 627.19, 'HPF-SF207050'),
    ('stretch-film-20-x-70-ga-x-5000ft-std', 'HPF-SF207050-FLP', 'Full Pallet (40 Rolls)', 40, 70, 5000, 30.049006, 1228.17, 'HPF-SF207050'),
    ('stretch-film-20-x-80-ga-x-5000ft', 'HPF-SF208050-HLP', 'Half Pallet (20 Rolls)', 20, 80, 5000, 34.06142, 707.28, 'HPF-SF208050'),
    ('stretch-film-20-x-80-ga-x-5000ft', 'HPF-SF208050-FLP', 'Full Pallet (40 Rolls)', 40, 80, 5000, 34.06142, 1288.51, 'HPF-SF208050');

  FOR rec IN
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_variants'
      AND column_name <> 'id'
    ORDER BY ordinal_position
  LOOP
    col_name := rec.column_name;
    expr := CASE col_name
      WHEN 'product_id' THEN 'p.id'
      WHEN 'sku' THEN 't.sku'
      WHEN 'title' THEN 't.tier_title'
      WHEN 'package_size' THEN 't.tier_title'
      WHEN 'rolls_count' THEN 't.rolls'
      WHEN 'rolls_per_box' THEN 't.rolls'
      WHEN 'boxes_count' THEN '0'
      WHEN 'price' THEN 'parent_price.amount'
      WHEN 'price_usd' THEN 'parent_price.amount'
      WHEN 'case_price_usd' THEN 'parent_price.amount'
      WHEN 'pallet_price_usd' THEN 'parent_price.amount'
      WHEN 'stock_quantity' THEN '9999'
      WHEN 'stock_status' THEN quote_literal('in_stock')
      WHEN 'width_inches' THEN '20'
      WHEN 'gauge' THEN 't.film_gauge'
      WHEN 'length_feet' THEN 't.length_ft'
      WHEN 'rolls_per_pallet' THEN '40'
      WHEN 'weight_lbs' THEN 't.pallet_lbs'
      WHEN 'roll_weight_lbs' THEN 't.roll_lbs'
      WHEN 'box_weight_lbs' THEN 'NULL'
      WHEN 'pallet_weight_lbs' THEN 't.pallet_lbs'
      WHEN 'created_at' THEN 'now()'
      WHEN 'updated_at' THEN 'now()'
      ELSE NULL
    END;

    IF expr IS NULL THEN
      IF rec.is_nullable = 'YES' OR rec.column_default IS NOT NULL THEN
        CONTINUE;
      ELSIF rec.data_type IN ('integer', 'bigint', 'smallint', 'numeric', 'real', 'double precision') THEN
        expr := '0';
      ELSIF rec.data_type = 'boolean' THEN
        expr := 'false';
      ELSIF rec.data_type IN ('text', 'character varying', 'character') THEN
        expr := quote_literal('');
      ELSE
        RAISE EXCEPTION
          'product_variants.% is NOT NULL, has no default, and was not mapped',
          col_name;
      END IF;
    END IF;

    IF expr = 'NULL' AND rec.is_nullable = 'NO' THEN
      expr := '0';
    END IF;

    col_list := col_list || CASE WHEN col_list = '' THEN '' ELSE ', ' END || quote_ident(col_name);
    val_list := val_list || CASE WHEN val_list = '' THEN '' ELSE ', ' END || expr;

    IF col_name NOT IN ('created_at', 'stock_quantity') THEN
      set_list := set_list || CASE WHEN set_list = '' THEN '' ELSE ', ' END;
      IF col_name IN ('price', 'price_usd', 'case_price_usd', 'pallet_price_usd') THEN
        set_list := set_list || format(
          '%1$I = CASE WHEN product_variants.%1$I IS NOT NULL AND product_variants.%1$I > 0 THEN product_variants.%1$I ELSE EXCLUDED.%1$I END',
          col_name
        );
      ELSE
        set_list := set_list || format('%1$I = EXCLUDED.%1$I', col_name);
      END IF;
    END IF;
  END LOOP;

  IF col_list = '' THEN
    RAISE EXCEPTION 'product_variants has no insertable columns';
  END IF;

  EXECUTE format(
    $sql$
      INSERT INTO public.product_variants (%s)
      SELECT %s
      FROM restore_tier AS t
      JOIN public.products AS p ON p.slug = t.slug
      CROSS JOIN LATERAL (
        SELECT COALESCE(
          CASE
            WHEN t.rolls = 20
              AND COALESCE(to_jsonb(p)->>'price_20_rolls', to_jsonb(p)->>'price_half_pallet', '') ~ '^[0-9]+(\.[0-9]+)?$'
              THEN COALESCE(to_jsonb(p)->>'price_20_rolls', to_jsonb(p)->>'price_half_pallet')::numeric
            WHEN t.rolls = 40
              AND COALESCE(to_jsonb(p)->>'price_40_rolls', to_jsonb(p)->>'price_pallet', '') ~ '^[0-9]+(\.[0-9]+)?$'
              THEN COALESCE(to_jsonb(p)->>'price_40_rolls', to_jsonb(p)->>'price_pallet')::numeric
          END,
          CASE
            WHEN COALESCE(to_jsonb(p)->>'price_usd', '') ~ '^[0-9]+(\.[0-9]+)?$'
              THEN (to_jsonb(p)->>'price_usd')::numeric
          END,
          CASE
            WHEN COALESCE(to_jsonb(p)->>'price', '') ~ '^[0-9]+(\.[0-9]+)?$'
              THEN (to_jsonb(p)->>'price')::numeric
          END,
          0.00
        ) AS amount
      ) AS parent_price
      ON CONFLICT (sku) DO UPDATE SET %s
    $sql$,
    col_list,
    val_list,
    set_list
  );

  UPDATE public.products AS p
  SET
    part_number = t.part_number,
    roll_weight_lbs = t.roll_lbs,
    pallet_weight_lbs = full_tier.pallet_lbs,
    is_active = true
  FROM restore_tier AS t
  JOIN restore_tier AS full_tier
    ON full_tier.slug = t.slug
   AND full_tier.rolls = 40
  WHERE p.slug = t.slug
    AND t.rolls = 20;
END $$;

SELECT
  p.slug,
  p.part_number,
  p.is_active,
  count(v.id) AS variant_count,
  string_agg(
    v.sku || ' | rolls=' || v.rolls_count || ' | boxes=' || v.boxes_count || ' | price=' || v.price,
    ' ; ' ORDER BY v.rolls_count
  ) AS variants
FROM public.products AS p
LEFT JOIN public.product_variants AS v
  ON v.product_id = p.id
 AND v.sku ~ '^HPF-SF[0-9]+-(HLP|FLP)$'
WHERE p.slug IN (
    'genesis-machine-film-20-51-7000',
    'genesis-machine-film-20-51-9000',
    'stretch-film-20-x-70-ga-x-5000ft-std',
    'stretch-film-20-x-80-ga-x-5000ft'
  )
GROUP BY p.slug, p.part_number, p.is_active
ORDER BY p.slug;
