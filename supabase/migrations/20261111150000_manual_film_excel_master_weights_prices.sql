-- Align Manual stretch film with Excel master sheet.
-- Weights:
--   roll_lbs from roll_kg × 2.20462
--   box_lbs  = (roll_kg × 4 + 0.450 carton kg) × 2.20462
--   pallet   = box_lbs × 48 + 40 lb wooden pallet
-- Pack-out: 48 boxes / 192 rolls. Tiers: 1 Box + Full Pallet only.
-- Dims: 15" → 48 x 40 x 68; 18" → 48 x 48 x 78.
-- Safe to re-run. Does not use products.application.

with master (
  slug,
  width_inches,
  gauge,
  length_feet,
  roll_lbs,
  box_lbs,
  pallet_lbs,
  pallet_dimensions,
  price_1_box,
  price_full_box
) as (
  values
    ('stretch-film-15-x-40-ga-x-1500ft', 15::numeric, 40::numeric, 1500::numeric, 4.50::numeric, 18.99::numeric, 951.52::numeric, '48 x 40 x 68', null::numeric, null::numeric),
    ('stretch-film-15-x-60-ga-x-1000ft', 15::numeric, 60::numeric, 1000::numeric, 5.42::numeric, 22.67::numeric, 1128.16::numeric, '48 x 40 x 68', 21.32::numeric, 20.39::numeric),
    ('stretch-film-15-x-60-ga-x-1500ft', 15::numeric, 60::numeric, 1500::numeric, 6.28::numeric, 26.12::numeric, 1293.76::numeric, '48 x 40 x 68', null::numeric, null::numeric),
    ('stretch-film-15-x-70-ga-x-1500ft', 15::numeric, 70::numeric, 1500::numeric, 7.19::numeric, 29.75::numeric, 1468.00::numeric, '48 x 40 x 68', 35.06::numeric, 33.42::numeric),
    ('stretch-film-15-x-80-ga-x-1500ft', 15::numeric, 80::numeric, 1500::numeric, 8.09::numeric, 33.36::numeric, 1641.28::numeric, '48 x 40 x 68', null::numeric, null::numeric),
    ('stretch-film-18-x-60-ga-x-1000ft', 18::numeric, 60::numeric, 1000::numeric, 6.15::numeric, 25.60::numeric, 1268.80::numeric, '48 x 48 x 78', 24.98::numeric, 23.86::numeric),
    ('stretch-film-18-x-60-ga-x-1500ft', 18::numeric, 60::numeric, 1500::numeric, 7.61::numeric, 31.43::numeric, 1548.64::numeric, '48 x 48 x 78', 35.98::numeric, 34.29::numeric),
    ('stretch-film-18-x-70-ga-x-1000ft', 18::numeric, 70::numeric, 1000::numeric, 6.88::numeric, 28.51::numeric, 1408.48::numeric, '48 x 48 x 78', 28.65::numeric, 27.34::numeric),
    ('stretch-film-18-x-70-ga-x-1500ft', 18::numeric, 70::numeric, 1500::numeric, 8.69::numeric, 35.75::numeric, 1756.00::numeric, '48 x 48 x 78', 41.47::numeric, 39.51::numeric),
    ('stretch-film-18-x-80-ga-x-1000ft', 18::numeric, 80::numeric, 1000::numeric, 8.66::numeric, 35.63::numeric, 1750.24::numeric, '48 x 48 x 78', 32.31::numeric, 30.82::numeric),
    ('stretch-film-18-x-80-ga-x-1500ft', 18::numeric, 80::numeric, 1500::numeric, 9.77::numeric, 40.08::numeric, 1963.84::numeric, '48 x 48 x 78', 46.97::numeric, 44.72::numeric)
)
update public.products p
set
  boxes_per_pallet = 48,
  roll_weight_lbs = m.roll_lbs,
  pallet_weight_lbs = m.pallet_lbs,
  pallet_dimensions = m.pallet_dimensions,
  pallet_height_in = case when m.width_inches = 15 then 68 else 78 end,
  price_1_box = m.price_1_box,
  price_64_boxes = m.price_full_box,
  price_16_boxes = null,
  price_32_boxes = null
from master m
where p.slug = m.slug
   or (
     round(coalesce(p.width_inches, 0)::numeric) = m.width_inches
     and round(coalesce(p.gauge, 0)::numeric) = m.gauge
     and coalesce(p.length_feet, 0) = m.length_feet
     and not (
       round(coalesce(p.width_inches, 0)::numeric) = 20
       or lower(coalesce(p.slug, '')) like '%genesis%'
       or lower(coalesce(p.slug, '')) like 'stretch-film-20%'
       or lower(coalesce(p.slug, '')) like '%machine%'
       or lower(coalesce(p.slug, '')) like '%automatic%'
     )
   );

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'box_weight_lbs'
  ) then
    execute $sql$
      with master (
        slug, width_inches, gauge, length_feet, box_lbs
      ) as (
        values
          ('stretch-film-15-x-40-ga-x-1500ft', 15::numeric, 40::numeric, 1500::numeric, 18.99::numeric),
          ('stretch-film-15-x-60-ga-x-1000ft', 15::numeric, 60::numeric, 1000::numeric, 22.67::numeric),
          ('stretch-film-15-x-60-ga-x-1500ft', 15::numeric, 60::numeric, 1500::numeric, 26.12::numeric),
          ('stretch-film-15-x-70-ga-x-1500ft', 15::numeric, 70::numeric, 1500::numeric, 29.75::numeric),
          ('stretch-film-15-x-80-ga-x-1500ft', 15::numeric, 80::numeric, 1500::numeric, 33.36::numeric),
          ('stretch-film-18-x-60-ga-x-1000ft', 18::numeric, 60::numeric, 1000::numeric, 25.60::numeric),
          ('stretch-film-18-x-60-ga-x-1500ft', 18::numeric, 60::numeric, 1500::numeric, 31.43::numeric),
          ('stretch-film-18-x-70-ga-x-1000ft', 18::numeric, 70::numeric, 1000::numeric, 28.51::numeric),
          ('stretch-film-18-x-70-ga-x-1500ft', 18::numeric, 70::numeric, 1500::numeric, 35.75::numeric),
          ('stretch-film-18-x-80-ga-x-1000ft', 18::numeric, 80::numeric, 1000::numeric, 35.63::numeric),
          ('stretch-film-18-x-80-ga-x-1500ft', 18::numeric, 80::numeric, 1500::numeric, 40.08::numeric)
      )
      update public.products p
      set box_weight_lbs = m.box_lbs
      from master m
      where p.slug = m.slug
         or (
           round(coalesce(p.width_inches, 0)::numeric) = m.width_inches
           and round(coalesce(p.gauge, 0)::numeric) = m.gauge
           and coalesce(p.length_feet, 0) = m.length_feet
         )
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'pallet_length_in'
  ) then
    execute $sql$
      update public.products p
      set
        pallet_length_in = 48,
        pallet_width_in = case when round(coalesce(p.width_inches, 0)::numeric) = 15 then 40 else 48 end,
        pallet_height_in = case when round(coalesce(p.width_inches, 0)::numeric) = 15 then 68 else 78 end
      where round(coalesce(p.width_inches, 0)::numeric) in (15, 18)
        and not (
          lower(coalesce(p.slug, '')) like '%genesis%'
          or lower(coalesce(p.slug, '')) like 'stretch-film-20%'
          or lower(coalesce(p.slug, '')) like '%machine%'
          or lower(coalesce(p.slug, '')) like '%automatic%'
        )
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'price_half_pallet'
  ) then
    execute $sql$
      update public.products p
      set price_half_pallet = null
      where round(coalesce(p.width_inches, 0)::numeric) in (15, 18)
        and not (
          lower(coalesce(p.slug, '')) like '%genesis%'
          or lower(coalesce(p.slug, '')) like 'stretch-film-20%'
          or lower(coalesce(p.slug, '')) like '%machine%'
        )
    $sql$;
  end if;
end $$;

-- Variant rows: 1 Box + Full Pallet only, with Excel-derived weights and per-box prices.
with master (
  slug,
  width_inches,
  gauge,
  length_feet,
  roll_lbs,
  box_lbs,
  pallet_lbs,
  price_1_box,
  price_full_box
) as (
  values
    ('stretch-film-15-x-40-ga-x-1500ft', 15::numeric, 40::numeric, 1500::numeric, 4.50::numeric, 18.99::numeric, 951.52::numeric, null::numeric, null::numeric),
    ('stretch-film-15-x-60-ga-x-1000ft', 15::numeric, 60::numeric, 1000::numeric, 5.42::numeric, 22.67::numeric, 1128.16::numeric, 21.32::numeric, 20.39::numeric),
    ('stretch-film-15-x-60-ga-x-1500ft', 15::numeric, 60::numeric, 1500::numeric, 6.28::numeric, 26.12::numeric, 1293.76::numeric, null::numeric, null::numeric),
    ('stretch-film-15-x-70-ga-x-1500ft', 15::numeric, 70::numeric, 1500::numeric, 7.19::numeric, 29.75::numeric, 1468.00::numeric, 35.06::numeric, 33.42::numeric),
    ('stretch-film-15-x-80-ga-x-1500ft', 15::numeric, 80::numeric, 1500::numeric, 8.09::numeric, 33.36::numeric, 1641.28::numeric, null::numeric, null::numeric),
    ('stretch-film-18-x-60-ga-x-1000ft', 18::numeric, 60::numeric, 1000::numeric, 6.15::numeric, 25.60::numeric, 1268.80::numeric, 24.98::numeric, 23.86::numeric),
    ('stretch-film-18-x-60-ga-x-1500ft', 18::numeric, 60::numeric, 1500::numeric, 7.61::numeric, 31.43::numeric, 1548.64::numeric, 35.98::numeric, 34.29::numeric),
    ('stretch-film-18-x-70-ga-x-1000ft', 18::numeric, 70::numeric, 1000::numeric, 6.88::numeric, 28.51::numeric, 1408.48::numeric, 28.65::numeric, 27.34::numeric),
    ('stretch-film-18-x-70-ga-x-1500ft', 18::numeric, 70::numeric, 1500::numeric, 8.69::numeric, 35.75::numeric, 1756.00::numeric, 41.47::numeric, 39.51::numeric),
    ('stretch-film-18-x-80-ga-x-1000ft', 18::numeric, 80::numeric, 1000::numeric, 8.66::numeric, 35.63::numeric, 1750.24::numeric, 32.31::numeric, 30.82::numeric),
    ('stretch-film-18-x-80-ga-x-1500ft', 18::numeric, 80::numeric, 1500::numeric, 9.77::numeric, 40.08::numeric, 1963.84::numeric, 46.97::numeric, 44.72::numeric)
)
update public.product_variants v
set
  roll_weight_lbs = m.roll_lbs,
  box_weight_lbs = m.box_lbs,
  pallet_weight_lbs = m.pallet_lbs,
  boxes_count = case
    when coalesce(v.boxes_count, 0) = 1 or coalesce(v.rolls_count, 0) = 4 then 1
    else 48
  end,
  rolls_count = case
    when coalesce(v.boxes_count, 0) = 1 or coalesce(v.rolls_count, 0) = 4 then 4
    else 192
  end,
  title = case
    when coalesce(v.boxes_count, 0) = 1 or coalesce(v.rolls_count, 0) = 4 then '1 Box'
    else 'Full Pallet (192 Rolls / 48 Boxes)'
  end,
  price = case
    when coalesce(v.boxes_count, 0) = 1 or coalesce(v.rolls_count, 0) = 4 then coalesce(m.price_1_box, v.price)
    else coalesce(m.price_full_box, v.price)
  end
from public.products p
join master m
  on p.slug = m.slug
  or (
    round(coalesce(p.width_inches, 0)::numeric) = m.width_inches
    and round(coalesce(p.gauge, 0)::numeric) = m.gauge
    and coalesce(p.length_feet, 0) = m.length_feet
  )
where v.product_id = p.id
  and (
    coalesce(v.boxes_count, 0) in (1, 24, 48, 64)
    or coalesce(v.rolls_count, 0) in (4, 96, 192, 256)
  );

-- Drop leftover intermediate Manual variants.
delete from public.product_variants v
using public.products p
where v.product_id = p.id
  and round(coalesce(p.width_inches, 0)::numeric) in (15, 18)
  and not (
    round(coalesce(p.width_inches, 0)::numeric) = 20
    or lower(coalesce(p.slug, '')) like '%genesis%'
    or lower(coalesce(p.slug, '')) like 'stretch-film-20%'
    or lower(coalesce(p.slug, '')) like '%machine%'
    or lower(coalesce(p.slug, '')) like '%automatic%'
  )
  and coalesce(v.boxes_count, 0) not in (1, 48)
  and coalesce(v.rolls_count, 0) not in (4, 192);
