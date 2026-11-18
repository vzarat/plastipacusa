-- Re-sync Automatic (GENESIS) pallet package totals.
-- Formula: half = half_per_roll × 20, full = full_per_roll × 40.
-- Never inherit Manual 48-box totals. Safe to re-run. Column-safe for live schema drift.

with master (
  slug, part_number, half_total, full_total
) as (
  values
    ('stretch-film-20-x-51-ga-x-7000ft', 'HPF-SF205170', 1016.80::numeric, 1701.20::numeric),
    ('stretch-film-20-x-51-ga-x-9000ft', 'HPF-SF205190', 1283.20::numeric, 2175.60::numeric),
    ('stretch-film-20-x-70-ga-x-5000ft', 'HPF-SF207050', 998.60::numeric, 1668.40::numeric),
    ('stretch-film-20-x-80-ga-x-5000ft', 'HPF-SF208050', 1129.20::numeric, 1901.20::numeric)
)
update public.products p
set
  price_20_rolls = m.half_total,
  price_40_rolls = m.full_total,
  price_half_pallet = m.half_total,
  price_pallet = m.full_total,
  price_usd = m.full_total
from master m
where p.slug = m.slug
   or p.part_number in (m.part_number, replace(m.part_number, '-', ''));

do $$
declare
  half_pred text := $p$
    coalesce(v.rolls_count, 0) = 20
    or v.sku ilike '%-HLP'
    or v.sku ilike '%-20R'
  $p$;
  machine_pred text := $p$
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
  $p$;
  price_set text := '';
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_variants' and column_name = 'price'
  ) then
    price_set := format(
      'price = case when %s then t.half_total else t.full_total end, ',
      half_pred
    );
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_variants' and column_name = 'price_usd'
  ) then
    price_set := price_set || format(
      'price_usd = case when %s then t.half_total else t.full_total end, ',
      half_pred
    );
  end if;

  if price_set = '' then
    return;
  end if;

  execute format(
    $sql$
      with totals (part_number, half_total, full_total) as (
        values
          ('HPF-SF205170', 1016.80::numeric, 1701.20::numeric),
          ('HPF-SF205190', 1283.20::numeric, 2175.60::numeric),
          ('HPF-SF207050', 998.60::numeric, 1668.40::numeric),
          ('HPF-SF208050', 1129.20::numeric, 1901.20::numeric)
      )
      update public.product_variants v
      set
        %s
        boxes_count = 0
      from public.products p
      join totals t
        on p.part_number in (t.part_number, replace(t.part_number, '-', ''))
        or p.slug in (
          'stretch-film-20-x-51-ga-x-7000ft',
          'stretch-film-20-x-51-ga-x-9000ft',
          'stretch-film-20-x-70-ga-x-5000ft',
          'stretch-film-20-x-80-ga-x-5000ft'
        )
      where v.product_id = p.id
        and (%s)
        and (
          coalesce(v.rolls_count, 0) in (20, 40)
          or v.sku ilike '%%-HLP'
          or v.sku ilike '%%-FLP'
          or v.sku ilike '%%-20R'
          or v.sku ilike '%%-40R'
        )
    $sql$,
    price_set,
    machine_pred
  );
end $$;
