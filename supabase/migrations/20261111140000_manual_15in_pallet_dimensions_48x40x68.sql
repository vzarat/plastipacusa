-- Manual 15" stretch film full-pallet dimensions: 48 x 40 x 68 (height strictly 68 in).
-- Manual 18" products keep their existing standard height (typically 48 x 48 x 78).
-- Safe to re-run. Does not use products.application (absent in live DB).

-- 1) Force 15" Manual pallet_dimensions + height columns.
update public.products p
set
  pallet_dimensions = '48 x 40 x 68',
  pallet_height_in = 68
where round(coalesce(p.width_inches, 0)::numeric) = 15
  and not (
    lower(coalesce(p.slug, '')) like '%genesis%'
    or lower(coalesce(p.slug, '')) like 'stretch-film-20%'
    or lower(coalesce(p.slug, '')) like '%machine%'
    or lower(coalesce(p.slug, '')) like '%automatic%'
    or lower(coalesce(p.title, '')) like '%machine%'
    or lower(coalesce(p.title, '')) like '%automatic%'
    or lower(coalesce(p.title, '')) like '%genesis%'
  );

-- Optional length/width columns when present (used by some freight audits).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'pallet_length_in'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'pallet_width_in'
  ) then
    execute $sql$
      update public.products p
      set
        pallet_length_in = 48,
        pallet_width_in = 40,
        pallet_height_in = 68,
        pallet_dimensions = '48 x 40 x 68'
      where round(coalesce(p.width_inches, 0)::numeric) = 15
        and not (
          lower(coalesce(p.slug, '')) like '%genesis%'
          or lower(coalesce(p.slug, '')) like 'stretch-film-20%'
          or lower(coalesce(p.slug, '')) like '%machine%'
          or lower(coalesce(p.slug, '')) like '%automatic%'
        )
    $sql$;
  end if;
end $$;

-- 2) Keep 18" Manual on the standard 48 x 48 x 78 pack when dimensions are missing/blank.
update public.products p
set
  pallet_dimensions = coalesce(nullif(trim(p.pallet_dimensions), ''), '48 x 48 x 78'),
  pallet_height_in = coalesce(p.pallet_height_in, 78)
where round(coalesce(p.width_inches, 0)::numeric) = 18
  and not (
    lower(coalesce(p.slug, '')) like '%genesis%'
    or lower(coalesce(p.slug, '')) like 'stretch-film-20%'
    or lower(coalesce(p.slug, '')) like '%machine%'
    or lower(coalesce(p.slug, '')) like '%automatic%'
  )
  and (
    p.pallet_dimensions is null
    or trim(p.pallet_dimensions) = ''
    or p.pallet_height_in is null
  );
