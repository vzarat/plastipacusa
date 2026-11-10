-- Manual 18" x 80 GA official per-box rates (2-tier).
-- Prefer supabase/migrations/20261110190000_manual_film_official_box_rates.sql
-- 1000 ft: 1 Box $32.31 / Full Pallet $30.82/box ($1,479.36)
-- 1500 ft: 1 Box $46.97 / Full Pallet $44.72/box ($2,146.56)

update public.products p
set
  price_1_box = case
    when p.length_feet::numeric = 1000 then 32.31
    when p.length_feet::numeric = 1500 then 46.97
    else p.price_1_box
  end,
  price_64_boxes = case
    when p.length_feet::numeric = 1000 then 30.82
    when p.length_feet::numeric = 1500 then 44.72
    else p.price_64_boxes
  end,
  price_16_boxes = null,
  price_32_boxes = null,
  boxes_per_pallet = 48
where p.slug in (
  'stretch-film-18-x-80-ga-x-1000ft',
  'stretch-film-18-x-80-ga-x-1500ft'
);

update public.product_variants v
set
  price = case
    when coalesce(v.boxes_count, 0) = 1 then
      case when p.length_feet::numeric = 1000 then 32.31 else 46.97 end
    when coalesce(v.boxes_count, 0) = 48 then
      case when p.length_feet::numeric = 1000 then 30.82 else 44.72 end
    else v.price
  end,
  boxes_count = case
    when coalesce(v.boxes_count, 0) = 1 then 1
    else 48
  end,
  rolls_count = case
    when coalesce(v.boxes_count, 0) = 1 then 4
    else 192
  end
from public.products p
where v.product_id = p.id
  and p.slug in (
    'stretch-film-18-x-80-ga-x-1000ft',
    'stretch-film-18-x-80-ga-x-1500ft'
  )
  and coalesce(v.boxes_count, 0) in (1, 48);
