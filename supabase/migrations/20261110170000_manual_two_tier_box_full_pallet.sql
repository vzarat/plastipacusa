-- Manual Stretch Film: enforce strict 2-tier purchasing
-- Tier 1 = 1 Box, Tier 2 = Full Pallet (boxes_per_pallet).
-- Removes half-pallet / intermediate hand variants and clears mid-tier price columns.
-- Safe to re-run. Does not reference products.application (column absent in live DB).

-- Hand-product predicate (exclude machine / automatic parents).
-- Machine ≈ width 20" or genesis/machine/automatic slug/title.

-- 1) Clear intermediate price columns on hand products.
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

-- 2) Delete half-pallet / intermediate variants on hand products.
--    Keep only: 1-box, OR boxes_count = products.boxes_per_pallet (full),
--    OR canonical full counts 24 / 48 / 64 when boxes_per_pallet is unset.
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
  and coalesce(pv.boxes_count, 0) <> 1
  and coalesce(pv.boxes_count, 0) <> coalesce(nullif(p.boxes_per_pallet, 0), -1)
  and coalesce(pv.boxes_count, 0) not in (24, 48, 64)
  and coalesce(pv.rolls_count, 0) not in (4, 96, 192, 256);

-- Explicit half-pallet box counts (half of 24 / half of 64).
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
    coalesce(pv.boxes_count, 0) in (12, 16, 32)
    or (
      coalesce(pv.rolls_count, 0) in (48, 64, 128)
      and coalesce(pv.boxes_count, 0) not in (24, 48, 64)
    )
  );

-- 3) Prefer boxes_per_pallet as the inventory / freight denominator when missing.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'boxes_per_pallet'
  ) then
    execute $sql$
      update public.products p
      set boxes_per_pallet = case
        when round(coalesce(p.width_inches, 0)::numeric) = 18
             and round(coalesce(p.gauge, 0)::numeric) = 80
             and round(coalesce(p.length_feet, 0)::numeric) in (1000, 1500)
          then 24
        else 64
      end
      where coalesce(p.boxes_per_pallet, 0) <= 0
        and not (
          round(coalesce(p.width_inches, 0)::numeric) = 20
          or lower(coalesce(p.slug, '')) like '%genesis%'
          or lower(coalesce(p.slug, '')) like 'stretch-film-20%'
          or lower(coalesce(p.slug, '')) like '%machine%'
          or lower(coalesce(p.slug, '')) like '%automatic%'
        )
    $sql$;
  end if;
end $$;
