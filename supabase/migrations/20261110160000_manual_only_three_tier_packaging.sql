-- Manual Stretch Film storefront (live DB has no products.application column):
-- 1) Deactivate machine / automatic SKUs via slug + width
-- 2) Clear intermediate 16-box hand pricing when column exists
-- 3) Remove intermediate hand variants (keep 1 / half / full only)
-- Safe to re-run.

-- 1) Disable automated / machine film from the active storefront catalog.
update public.products p
set is_active = false
where coalesce(p.is_active, true) = true
  and (
    round(coalesce(p.width_inches, 0)::numeric) = 20
    or lower(coalesce(p.slug, '')) like '%genesis%'
    or lower(coalesce(p.slug, '')) like 'stretch-film-20%'
    or lower(coalesce(p.slug, '')) like '%-20-x-%'
    or lower(coalesce(p.slug, '')) like '%machine%'
    or lower(coalesce(p.slug, '')) like '%automatic%'
    or lower(coalesce(p.title, '')) like '%machine%'
    or lower(coalesce(p.title, '')) like '%automatic%'
    or lower(coalesce(p.title, '')) like '%genesis%'
  );

-- 2) Clear legacy intermediate hand-film price column (16-box layer), when present.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'price_16_boxes'
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
end $$;

-- 3) Remove intermediate hand variants that are not 1-box / half / full pallet.
--    Keep 1, 12, 24, 32, 48, and 64 box packs.
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
  and coalesce(pv.boxes_count, 0) not in (0, 1, 12, 24, 32, 48, 64)
  and coalesce(pv.rolls_count, 0) not in (0, 4, 48, 96, 128, 192, 256);

-- Classic 16-box / 64-roll intermediate layer packs on hand products.
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
  and (
    coalesce(pv.boxes_count, 0) = 16
    or (
      coalesce(pv.rolls_count, 0) = 64
      and coalesce(pv.boxes_count, 0) in (0, 16)
    )
  );
