-- 18" x 80 GA x 1000 FT and 1500 FT package tiers
-- Half pallet: 16 boxes -> 12 boxes (48 rolls)
-- Full pallet: 32 boxes -> 24 boxes (96 rolls)
-- The larger 64-box row stays available, without a second "FULL PALLET" label.

update public.product_variants v
set
  title = '12 BOXES = 48 ROLLS (HALF PALLET)',
  boxes_count = 12,
  rolls_count = 48
from public.products p
where v.product_id = p.id
  and p.slug in (
    'stretch-film-18-x-80-ga-x-1000ft',
    'stretch-film-18-x-80-ga-x-1500ft'
  )
  and v.boxes_count = 16;

update public.product_variants v
set
  title = '24 BOXES = 96 ROLLS (FULL PALLET)',
  boxes_count = 24,
  rolls_count = 96
from public.products p
where v.product_id = p.id
  and p.slug in (
    'stretch-film-18-x-80-ga-x-1000ft',
    'stretch-film-18-x-80-ga-x-1500ft'
  )
  and v.boxes_count = 32;

update public.product_variants v
set title = '64 BOXES = 256 ROLLS'
from public.products p
where v.product_id = p.id
  and p.slug in (
    'stretch-film-18-x-80-ga-x-1000ft',
    'stretch-film-18-x-80-ga-x-1500ft'
  )
  and v.boxes_count = 64
  and v.title ilike '%FULL PALLET%';
