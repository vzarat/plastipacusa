-- Sync Automatic stretch film (GENESIS HP) to the official 4-spec matrix.
-- Half pallet = Tarima con 20 Rolls. Full pallet = Tarima c/40 Rolls.
-- Prices are pallet totals (per-roll × rolls). Weights are scale weights with tare.
-- Dimensions: 48 x 40 x 46. Safe to re-run. Does not touch Manual (15"/18") film.
-- Live Supabase products table has no brand column — do not reference it.

-- 1) Core product sync
with master (
  slug, part_number, width_inches, gauge, length_feet, title,
  roll_lbs, half_lbs, full_lbs, half_total, full_total, half_sku, full_sku
) as (
  values
    (
      'stretch-film-20-x-51-ga-x-7000ft', 'HPF-SF205170', 20::numeric, 51::numeric, 7000::numeric,
      'STRETCH FILM 20" X 51 GA X 7000 FT',
      30.600162::numeric, 638.00::numeric, 1250.01::numeric, 1016.80::numeric, 1701.20::numeric,
      'HPF-SF205170-HLP', 'HPF-SF205170-FLP'
    ),
    (
      'stretch-film-20-x-51-ga-x-9000ft', 'HPF-SF205190', 20::numeric, 51::numeric, 9000::numeric,
      'STRETCH FILM 20" X 51 GA X 9000 FT',
      38.779312::numeric, 802.13::numeric, 1577.71::numeric, 1283.20::numeric, 2175.60::numeric,
      'HPF-SF205190-HLP', 'HPF-SF205190-FLP'
    ),
    (
      'stretch-film-20-x-70-ga-x-5000ft', 'HPF-SF207050', 20::numeric, 70::numeric, 5000::numeric,
      'STRETCH FILM 20" X 70 GA X 5000 FT',
      30.049006::numeric, 627.19::numeric, 1228.17::numeric, 998.60::numeric, 1668.40::numeric,
      'HPF-SF207050-HLP', 'HPF-SF207050-FLP'
    ),
    (
      'stretch-film-20-x-80-ga-x-5000ft', 'HPF-SF208050', 20::numeric, 80::numeric, 5000::numeric,
      'STRETCH FILM 20" X 80 GA X 5000 FT',
      34.06142::numeric, 707.28::numeric, 1288.51::numeric, 1129.20::numeric, 1901.20::numeric,
      'HPF-SF208050-HLP', 'HPF-SF208050-FLP'
    )
)
update public.products p
set
  is_active = true,
  part_number = m.part_number,
  title = coalesce(nullif(trim(p.title), ''), m.title),
  width_inches = m.width_inches,
  gauge = m.gauge,
  length_feet = m.length_feet,
  roll_weight_lbs = m.roll_lbs,
  pallet_weight_lbs = m.full_lbs,
  pallet_dimensions = '48 x 40 x 46',
  price_20_rolls = m.half_total,
  price_40_rolls = m.full_total,
  price_half_pallet = m.half_total,
  price_pallet = m.full_total,
  price_usd = m.full_total
from master m
where p.slug = m.slug
   or p.part_number in (m.part_number, replace(m.part_number, '-', ''))
   or (
     round(coalesce(p.width_inches, 0)::numeric) = m.width_inches
     and round(coalesce(p.gauge, 0)::numeric) = m.gauge
     and round(coalesce(p.length_feet, 0)::numeric) = m.length_feet
     and (
       coalesce(p.slug, '') ilike 'stretch-film-20%'
       or coalesce(p.slug, '') ilike '%genesis%'
       or coalesce(p.part_number, '') ilike 'HPF-SF%'
       or coalesce(p.part_number, '') ilike 'HPFSF%'
     )
   );

-- 2) Optional product columns
do $$
declare
  machine_match text := $pred$
    p.slug in (
      'stretch-film-20-x-51-ga-x-7000ft',
      'stretch-film-20-x-51-ga-x-9000ft',
      'stretch-film-20-x-70-ga-x-5000ft',
      'stretch-film-20-x-80-ga-x-5000ft'
    )
    or p.part_number in (
      'HPF-SF205170', 'HPF-SF205190', 'HPF-SF207050', 'HPF-SF208050',
      'HPFSF205170', 'HPFSF205190', 'HPFSF207050', 'HPFSF208050'
    )
  $pred$;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'storefront_title'
  ) then
    execute format(
      'update public.products p
       set storefront_title = coalesce(nullif(trim(p.storefront_title), ''''), p.title)
       where %s',
      machine_match
    );
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'rolls_per_box'
  ) then
    execute format('update public.products p set rolls_per_box = 1 where %s', machine_match);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'pallet_height_in'
  ) then
    execute format(
      'update public.products p
       set pallet_length_in = 48, pallet_width_in = 40, pallet_height_in = 46
       where %s',
      machine_match
    );
  end if;
end $$;

-- 3) Soft-hide non-official Automatic / 20" machine SKUs
update public.products p
set is_active = false
where (
    round(coalesce(p.width_inches, 0)::numeric) = 20
    or coalesce(p.slug, '') ilike 'stretch-film-20%'
    or coalesce(p.slug, '') ilike '%genesis-machine%'
    or coalesce(p.part_number, '') ilike 'HPF-SF%'
    or coalesce(p.part_number, '') ilike 'HPFSF%'
  )
  and round(coalesce(p.width_inches, 0)::numeric) not in (12, 15, 18)
  and coalesce(p.slug, '') not ilike 'stretch-film-15%'
  and coalesce(p.slug, '') not ilike 'stretch-film-18%'
  and not (
    (
      round(coalesce(p.width_inches, 0)::numeric) = 20
      and round(coalesce(p.gauge, 0)::numeric) = 51
      and round(coalesce(p.length_feet, 0)::numeric) in (7000, 9000)
    )
    or (
      round(coalesce(p.width_inches, 0)::numeric) = 20
      and round(coalesce(p.gauge, 0)::numeric) in (70, 80)
      and round(coalesce(p.length_feet, 0)::numeric) = 5000
    )
    or p.slug in (
      'stretch-film-20-x-51-ga-x-7000ft',
      'stretch-film-20-x-51-ga-x-9000ft',
      'stretch-film-20-x-70-ga-x-5000ft',
      'stretch-film-20-x-80-ga-x-5000ft'
    )
  );

-- 4) Sync official 20 / 40 roll variants (only columns that exist on live DB)
do $$
declare
  set_list text := '';
  half_pred text := $p$coalesce(v.rolls_count, 0) = 20 or v.sku ilike '%-HLP' or v.sku ilike '%-20R'$p$;
begin
  create temporary table machine_variant_master (
    slug text,
    part_number text,
    width_inches numeric,
    gauge numeric,
    length_feet numeric,
    roll_lbs numeric,
    half_lbs numeric,
    full_lbs numeric,
    half_total numeric,
    full_total numeric,
    half_sku text,
    full_sku text
  ) on commit drop;

  insert into machine_variant_master values
    ('stretch-film-20-x-51-ga-x-7000ft', 'HPF-SF205170', 20, 51, 7000, 30.600162, 638.00, 1250.01, 1016.80, 1701.20, 'HPF-SF205170-HLP', 'HPF-SF205170-FLP'),
    ('stretch-film-20-x-51-ga-x-9000ft', 'HPF-SF205190', 20, 51, 9000, 38.779312, 802.13, 1577.71, 1283.20, 2175.60, 'HPF-SF205190-HLP', 'HPF-SF205190-FLP'),
    ('stretch-film-20-x-70-ga-x-5000ft', 'HPF-SF207050', 20, 70, 5000, 30.049006, 627.19, 1228.17, 998.60, 1668.40, 'HPF-SF207050-HLP', 'HPF-SF207050-FLP'),
    ('stretch-film-20-x-80-ga-x-5000ft', 'HPF-SF208050', 20, 80, 5000, 34.06142, 707.28, 1288.51, 1129.20, 1901.20, 'HPF-SF208050-HLP', 'HPF-SF208050-FLP');

  -- Always-safe core columns used by prior live migrations.
  set_list := format($sql$
    sku = case when %1$s then t.half_sku else t.full_sku end,
    title = case when %1$s then 'Half Pallet (20 Rolls)' else 'Full Pallet (40 Rolls)' end,
    rolls_count = case when %1$s then 20 else 40 end,
    boxes_count = 0,
    price = case when %1$s then t.half_total else t.full_total end
  $sql$, half_pred);

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_variants' and column_name = 'rolls_per_box'
  ) then
    set_list := set_list || format(
      ', rolls_per_box = case when %s then 20 else 40 end',
      half_pred
    );
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_variants' and column_name = 'rolls_per_pallet'
  ) then
    set_list := set_list || ', rolls_per_pallet = 40';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_variants' and column_name = 'package_size'
  ) then
    set_list := set_list || format(
      ', package_size = case when %s then ''Half Pallet (20 Rolls)'' else ''Full Pallet (40 Rolls)'' end',
      half_pred
    );
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_variants' and column_name = 'width_inches'
  ) then
    set_list := set_list || ', width_inches = t.width_inches, gauge = t.gauge, length_feet = t.length_feet';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_variants' and column_name = 'roll_weight_lbs'
  ) then
    set_list := set_list || ', roll_weight_lbs = t.roll_lbs';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_variants' and column_name = 'box_weight_lbs'
  ) then
    set_list := set_list || ', box_weight_lbs = null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_variants' and column_name = 'pallet_weight_lbs'
  ) then
    set_list := set_list || format(
      ', pallet_weight_lbs = case when %s then t.half_lbs else t.full_lbs end',
      half_pred
    );
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_variants' and column_name = 'weight_lbs'
  ) then
    set_list := set_list || format(
      ', weight_lbs = case when %s then t.half_lbs else t.full_lbs end',
      half_pred
    );
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_variants' and column_name = 'price_usd'
  ) then
    set_list := set_list || format(
      ', price_usd = case when %s then t.half_total else t.full_total end',
      half_pred
    );
  end if;

  execute format($sql$
    update public.product_variants v
    set %s
    from (
      select p.id as product_id, m.*
      from public.products p
      join machine_variant_master m
        on p.slug = m.slug
        or p.part_number in (m.part_number, replace(m.part_number, '-', ''))
        or (
          round(coalesce(p.width_inches, 0)::numeric) = m.width_inches
          and round(coalesce(p.gauge, 0)::numeric) = m.gauge
          and round(coalesce(p.length_feet, 0)::numeric) = m.length_feet
        )
    ) t
    where v.product_id = t.product_id
      and (
        coalesce(v.rolls_count, 0) in (20, 40)
        or v.sku in (t.half_sku, t.full_sku)
        or v.sku ilike '%%-HLP'
        or v.sku ilike '%%-FLP'
        or v.sku ilike '%%-20R'
        or v.sku ilike '%%-40R'
      )
  $sql$, set_list);
end $$;

-- 6) Drop leftover intermediate Automatic variants (not 20/40)
delete from public.product_variants v
using public.products p
where v.product_id = p.id
  and (
    p.part_number in (
      'HPF-SF205170', 'HPF-SF205190', 'HPF-SF207050', 'HPF-SF208050',
      'HPFSF205170', 'HPFSF205190', 'HPFSF207050', 'HPFSF208050'
    )
    or p.slug in (
      'stretch-film-20-x-51-ga-x-7000ft',
      'stretch-film-20-x-51-ga-x-9000ft',
      'stretch-film-20-x-70-ga-x-5000ft',
      'stretch-film-20-x-80-ga-x-5000ft'
    )
  )
  and coalesce(v.rolls_count, 0) not in (20, 40)
  and v.sku not ilike '%-HLP'
  and v.sku not ilike '%-FLP';
