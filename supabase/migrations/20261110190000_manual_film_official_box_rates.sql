-- Official Manual stretch film box rates (per box).
-- 1 Box tier + Full Pallet (48 boxes / 192 rolls) only.
-- product_variants.price and products.price_*_boxes store the per-box unit rate.
-- Safe to re-run. Does not use products.application (absent in live DB).

-- 1) Force full-pallet pack-out on every matching Manual SKU.
update public.products p
set boxes_per_pallet = 48
where round(coalesce(p.width_inches, 0)::numeric) in (15, 18)
  and round(coalesce(p.gauge, 0)::numeric) in (60, 70, 80)
  and coalesce(p.length_feet, 0) in (1000, 1500)
  and not (
    round(coalesce(p.width_inches, 0)::numeric) = 20
    or lower(coalesce(p.slug, '')) like '%genesis%'
    or lower(coalesce(p.slug, '')) like 'stretch-film-20%'
    or lower(coalesce(p.slug, '')) like '%machine%'
    or lower(coalesce(p.slug, '')) like '%automatic%'
  );

-- 2) Apply official per-box rates on products + 1-box / 48-box variants.
with rates (
  width_inches,
  gauge,
  length_feet,
  price_1_box,
  price_full_box
) as (
  values
    (15::numeric, 60::numeric, 1000::numeric, 21.32::numeric, 20.39::numeric),
    (15::numeric, 70::numeric, 1500::numeric, 35.06::numeric, 33.42::numeric),
    (18::numeric, 60::numeric, 1000::numeric, 24.98::numeric, 23.86::numeric),
    (18::numeric, 60::numeric, 1500::numeric, 35.98::numeric, 34.29::numeric),
    (18::numeric, 70::numeric, 1000::numeric, 28.65::numeric, 27.34::numeric),
    (18::numeric, 70::numeric, 1500::numeric, 41.47::numeric, 39.51::numeric),
    (18::numeric, 80::numeric, 1000::numeric, 32.31::numeric, 30.82::numeric),
    (18::numeric, 80::numeric, 1500::numeric, 46.97::numeric, 44.72::numeric)
)
update public.products p
set
  price_1_box = r.price_1_box,
  price_64_boxes = r.price_full_box,
  price_16_boxes = null,
  price_32_boxes = null,
  boxes_per_pallet = 48
from rates r
where round(coalesce(p.width_inches, 0)::numeric) = r.width_inches
  and round(coalesce(p.gauge, 0)::numeric) = r.gauge
  and coalesce(p.length_feet, 0) = r.length_feet
  and not (
    round(coalesce(p.width_inches, 0)::numeric) = 20
    or lower(coalesce(p.slug, '')) like '%genesis%'
    or lower(coalesce(p.slug, '')) like 'stretch-film-20%'
    or lower(coalesce(p.slug, '')) like '%machine%'
    or lower(coalesce(p.slug, '')) like '%automatic%'
  );

with rates (
  width_inches,
  gauge,
  length_feet,
  price_1_box,
  price_full_box
) as (
  values
    (15::numeric, 60::numeric, 1000::numeric, 21.32::numeric, 20.39::numeric),
    (15::numeric, 70::numeric, 1500::numeric, 35.06::numeric, 33.42::numeric),
    (18::numeric, 60::numeric, 1000::numeric, 24.98::numeric, 23.86::numeric),
    (18::numeric, 60::numeric, 1500::numeric, 35.98::numeric, 34.29::numeric),
    (18::numeric, 70::numeric, 1000::numeric, 28.65::numeric, 27.34::numeric),
    (18::numeric, 70::numeric, 1500::numeric, 41.47::numeric, 39.51::numeric),
    (18::numeric, 80::numeric, 1000::numeric, 32.31::numeric, 30.82::numeric),
    (18::numeric, 80::numeric, 1500::numeric, 46.97::numeric, 44.72::numeric)
)
update public.product_variants v
set
  price = case
    when coalesce(v.boxes_count, 0) = 1 or coalesce(v.rolls_count, 0) = 4 then r.price_1_box
    else r.price_full_box
  end,
  boxes_count = case
    when coalesce(v.boxes_count, 0) = 1 or coalesce(v.rolls_count, 0) = 4 then 1
    else 48
  end,
  rolls_count = case
    when coalesce(v.boxes_count, 0) = 1 or coalesce(v.rolls_count, 0) = 4 then 4
    else 192
  end,
  title = case
    when coalesce(v.boxes_count, 0) = 1 or coalesce(v.rolls_count, 0) = 4 then '1 Box (4 Rolls)'
    else 'Full Pallet · 48 Boxes (192 Rolls)'
  end
from public.products p
join rates r
  on round(coalesce(p.width_inches, 0)::numeric) = r.width_inches
 and round(coalesce(p.gauge, 0)::numeric) = r.gauge
 and coalesce(p.length_feet, 0) = r.length_feet
where v.product_id = p.id
  and not (
    round(coalesce(p.width_inches, 0)::numeric) = 20
    or lower(coalesce(p.slug, '')) like '%genesis%'
    or lower(coalesce(p.slug, '')) like 'stretch-film-20%'
    or lower(coalesce(p.slug, '')) like '%machine%'
    or lower(coalesce(p.slug, '')) like '%automatic%'
  )
  and (
    -- 1 Box tier
    coalesce(v.boxes_count, 0) = 1
    or coalesce(v.rolls_count, 0) = 4
    -- Full / legacy full pallet only (not 16-box layer)
    or coalesce(v.boxes_count, 0) in (24, 48, 64)
    or coalesce(v.rolls_count, 0) in (96, 192, 256)
  );

-- Optional price_usd mirror when that column exists.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_variants' and column_name = 'price_usd'
  ) then
    execute $sql$
      with rates (
        width_inches, gauge, length_feet, price_1_box, price_full_box
      ) as (
        values
          (15::numeric, 60::numeric, 1000::numeric, 21.32::numeric, 20.39::numeric),
          (15::numeric, 70::numeric, 1500::numeric, 35.06::numeric, 33.42::numeric),
          (18::numeric, 60::numeric, 1000::numeric, 24.98::numeric, 23.86::numeric),
          (18::numeric, 60::numeric, 1500::numeric, 35.98::numeric, 34.29::numeric),
          (18::numeric, 70::numeric, 1000::numeric, 28.65::numeric, 27.34::numeric),
          (18::numeric, 70::numeric, 1500::numeric, 41.47::numeric, 39.51::numeric),
          (18::numeric, 80::numeric, 1000::numeric, 32.31::numeric, 30.82::numeric),
          (18::numeric, 80::numeric, 1500::numeric, 46.97::numeric, 44.72::numeric)
      )
      update public.product_variants v
      set price_usd = case
        when coalesce(v.boxes_count, 0) = 1 then r.price_1_box
        when coalesce(v.boxes_count, 0) = 48 then r.price_full_box
        else v.price_usd
      end
      from public.products p
      join rates r
        on round(coalesce(p.width_inches, 0)::numeric) = r.width_inches
       and round(coalesce(p.gauge, 0)::numeric) = r.gauge
       and coalesce(p.length_feet, 0) = r.length_feet
      where v.product_id = p.id
        and coalesce(v.boxes_count, 0) in (1, 48)
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
        and round(coalesce(p.gauge, 0)::numeric) in (60, 70, 80)
        and coalesce(p.length_feet, 0) in (1000, 1500)
    $sql$;
  end if;
end $$;

-- Drop any leftover intermediate Manual variants for these SKUs.
delete from public.product_variants v
using public.products p
where v.product_id = p.id
  and round(coalesce(p.width_inches, 0)::numeric) in (15, 18)
  and round(coalesce(p.gauge, 0)::numeric) in (60, 70, 80)
  and coalesce(p.length_feet, 0) in (1000, 1500)
  and not (
    round(coalesce(p.width_inches, 0)::numeric) = 20
    or lower(coalesce(p.slug, '')) like '%genesis%'
    or lower(coalesce(p.slug, '')) like 'stretch-film-20%'
    or lower(coalesce(p.slug, '')) like '%machine%'
    or lower(coalesce(p.slug, '')) like '%automatic%'
  )
  and coalesce(v.boxes_count, 0) not in (1, 48)
  and coalesce(v.rolls_count, 0) not in (4, 192);
