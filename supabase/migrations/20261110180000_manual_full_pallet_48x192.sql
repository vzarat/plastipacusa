-- Standardize ALL manual stretch film full pallets to 48 boxes / 192 rolls.
-- Keep storefront purchasing at 2 tiers only: 1 Box + Full Pallet.
-- Does not use products.application (absent in live DB).
-- Safe to re-run.

-- Hand / manual product predicate (exclude machine / automatic).
-- Machine ≈ width 20" or genesis/machine/automatic slug/title.

-- 1) Force boxes_per_pallet = 48 on every manual product.
update public.products p
set boxes_per_pallet = 48
where not (
  round(coalesce(p.width_inches, 0)::numeric) = 20
  or lower(coalesce(p.slug, '')) like '%genesis%'
  or lower(coalesce(p.slug, '')) like 'stretch-film-20%'
  or lower(coalesce(p.slug, '')) like '%machine%'
  or lower(coalesce(p.slug, '')) like '%automatic%'
  or lower(coalesce(p.title, '')) like '%machine%'
  or lower(coalesce(p.title, '')) like '%automatic%'
  or lower(coalesce(p.title, '')) like '%genesis%'
);

-- 2) Clear intermediate price columns on manual products.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'price_16_boxes'
  ) then
    execute $sql$
      update public.products p
      set price_16_boxes = null
      where not (
        round(coalesce(p.width_inches, 0)::numeric) = 20
        or lower(coalesce(p.slug, '')) like '%genesis%'
        or lower(coalesce(p.slug, '')) like 'stretch-film-20%'
        or lower(coalesce(p.slug, '')) like '%machine%'
        or lower(coalesce(p.slug, '')) like '%automatic%'
      )
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'price_32_boxes'
  ) then
    execute $sql$
      update public.products p
      set price_32_boxes = null
      where not (
        round(coalesce(p.width_inches, 0)::numeric) = 20
        or lower(coalesce(p.slug, '')) like '%genesis%'
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
      where not (
        round(coalesce(p.width_inches, 0)::numeric) = 20
        or lower(coalesce(p.slug, '')) like '%genesis%'
        or lower(coalesce(p.slug, '')) like 'stretch-film-20%'
        or lower(coalesce(p.slug, '')) like '%machine%'
        or lower(coalesce(p.slug, '')) like '%automatic%'
      )
    $sql$;
  end if;
end $$;

-- 3) Remap legacy full/half pallet variants → standardized 48 boxes / 192 rolls.
update public.product_variants pv
set
  boxes_count = 48,
  rolls_count = 192
from public.products p
where pv.product_id = p.id
  and not (
    round(coalesce(p.width_inches, 0)::numeric) = 20
    or lower(coalesce(p.slug, '')) like '%genesis%'
    or lower(coalesce(p.slug, '')) like 'stretch-film-20%'
    or lower(coalesce(p.slug, '')) like '%machine%'
    or lower(coalesce(p.slug, '')) like '%automatic%'
  )
  and (
    coalesce(pv.boxes_count, 0) in (24, 32, 48, 64)
    or coalesce(pv.rolls_count, 0) in (96, 128, 192, 256)
  );

-- Drop any remaining non 1-box / non 48-box hand variants.
delete from public.product_variants pv
using public.products p
where pv.product_id = p.id
  and not (
    round(coalesce(p.width_inches, 0)::numeric) = 20
    or lower(coalesce(p.slug, '')) like '%genesis%'
    or lower(coalesce(p.slug, '')) like 'stretch-film-20%'
    or lower(coalesce(p.slug, '')) like '%machine%'
    or lower(coalesce(p.slug, '')) like '%automatic%'
  )
  and coalesce(pv.boxes_count, 0) not in (1, 48)
  and coalesce(pv.rolls_count, 0) not in (4, 192);
