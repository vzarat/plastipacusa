-- Restore volume pricing after the 18" x 80 GA box-count change.
-- Previous per-box rates (16-box and 32-box totals) applied to 12 and 24 boxes.
-- 1000 ft: $33.14 / box > $31.67 / box > $30.20 / box
-- 1500 ft: $49.70 / box > $47.50 / box > $45.31 / box

update public.product_variants v
set price = 380.03
from public.products p
where v.product_id = p.id
  and p.slug = 'stretch-film-18-x-80-ga-x-1000ft'
  and v.boxes_count = 12;

update public.product_variants v
set price = 724.88
from public.products p
where v.product_id = p.id
  and p.slug = 'stretch-film-18-x-80-ga-x-1000ft'
  and v.boxes_count = 24;

update public.product_variants v
set price = 570.05
from public.products p
where v.product_id = p.id
  and p.slug = 'stretch-film-18-x-80-ga-x-1500ft'
  and v.boxes_count = 12;

update public.product_variants v
set price = 1087.32
from public.products p
where v.product_id = p.id
  and p.slug = 'stretch-film-18-x-80-ga-x-1500ft'
  and v.boxes_count = 24;
