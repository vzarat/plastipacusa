-- Hard delete EVERY Automatic / machine stretch film product that is not one of
-- the 4 official master specs (each with HLP 20-roll + FLP 40-roll variants only).
-- Targets ghosts like 60 GA / 63 GA / 6000 FT, "No Part #", unpriced orphans.
-- Manual 12"/15"/18" hand film is never touched. Safe to re-run.
-- Column-safe: live products may lack name / application / type.

do $$
declare
  has_name boolean;
  has_application boolean;
  has_type boolean;
  has_title boolean;
  has_categories boolean;
  authorized_sql text;
  machine_signal text := '';
  text_cols text := '';
  unauthorized_sql text;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'name'
  ) into has_name;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'application'
  ) into has_application;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'type'
  ) into has_type;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'title'
  ) into has_title;
  select to_regclass('public.categories') is not null into has_categories;

  -- Canonical keep list: official slug, part number, or exact 20×gauge×length.
  authorized_sql := $sql$
    create temporary table _authorized_automatic_ids on commit drop as
    select p.id
    from public.products p
    where
      p.slug in (
        'stretch-film-20-x-51-ga-x-7000ft',
        'stretch-film-20-x-51-ga-x-9000ft',
        'stretch-film-20-x-70-ga-x-5000ft',
        'stretch-film-20-x-80-ga-x-5000ft'
      )
      or upper(replace(coalesce(p.part_number, ''), '-', '')) in (
        'HPFSF205170', 'HPFSF205190', 'HPFSF207050', 'HPFSF208050'
      )
      or (
        round(coalesce(p.width_inches, 0)::numeric) = 20
        and (
          (
            round(coalesce(p.gauge, 0)::numeric) = 51
            and round(coalesce(p.length_feet, 0)::numeric) in (7000, 9000)
          )
          or (
            round(coalesce(p.gauge, 0)::numeric) in (70, 80)
            and round(coalesce(p.length_feet, 0)::numeric) = 5000
          )
        )
      )
  $sql$;
  execute authorized_sql;

  if has_application then
    machine_signal := machine_signal ||
      $s$ or lower(coalesce(p.application::text, '')) in ('machine', 'automatic') $s$;
  end if;
  if has_type then
    machine_signal := machine_signal ||
      $s$ or lower(coalesce(p.type::text, '')) in ('machine', 'automatic') $s$;
  end if;
  if has_title then
    text_cols := text_cols ||
      $s$
      or coalesce(p.title, '') ilike '%machine%'
      or coalesce(p.title, '') ilike '%automatic%'
      or coalesce(p.title, '') ilike '%genesis%'
      or coalesce(p.title, '') ~* '20"?[[:space:]]*X[[:space:]]*60[[:space:]]*GA'
      or coalesce(p.title, '') ~* '20"?[[:space:]]*X[[:space:]]*63[[:space:]]*GA'
      or coalesce(p.title, '') ~* '6000[[:space:]]*FT'
      $s$;
  end if;
  if has_name then
    text_cols := text_cols ||
      $s$
      or coalesce(p.name, '') ilike '%machine%'
      or coalesce(p.name, '') ilike '%automatic%'
      or coalesce(p.name, '') ilike '%genesis%'
      or coalesce(p.name, '') ~* '20"?[[:space:]]*X[[:space:]]*60[[:space:]]*GA'
      or coalesce(p.name, '') ~* '20"?[[:space:]]*X[[:space:]]*63[[:space:]]*GA'
      or coalesce(p.name, '') ~* '6000[[:space:]]*FT'
      $s$;
  end if;

  unauthorized_sql := format($sql$
    create temporary table _unauthorized_automatic_ids on commit drop as
    select p.id
    from public.products p
    where p.id not in (select id from _authorized_automatic_ids)
      and (
        round(coalesce(p.width_inches, 0)::numeric) = 20
        or coalesce(p.slug, '') ilike 'stretch-film-20%%'
        or coalesce(p.slug, '') ilike '%%genesis-machine%%'
        or coalesce(p.slug, '') ilike '%%-20-x-%%'
        or coalesce(p.slug, '') ilike '%%6000ft%%'
        or coalesce(p.slug, '') ~* '60-ga|63-ga|6000'
        or coalesce(p.part_number, '') ilike 'HPF-SF%%'
        or coalesce(p.part_number, '') ilike 'HPFSF%%'
        -- Obsolete Automatic fingerprints (never match Manual 15"/18" 60 GA)
        or (
          round(coalesce(p.width_inches, 0)::numeric) = 20
          and (
            round(coalesce(p.gauge, 0)::numeric) in (60, 63)
            or round(coalesce(p.length_feet, 0)::numeric) = 6000
          )
        )
        %s
        %s
        %s
      )
      and round(coalesce(p.width_inches, 0)::numeric) not in (12, 15, 18)
      and coalesce(p.slug, '') not ilike 'stretch-film-12%%'
      and coalesce(p.slug, '') not ilike 'stretch-film-15%%'
      and coalesce(p.slug, '') not ilike 'stretch-film-18%%'
      %s
      %s
  $sql$,
    machine_signal,
    text_cols,
    case when has_categories then
      $c$
      or exists (
        select 1 from public.categories c
        where c.id::text = p.category_id::text
          and (
            lower(c.slug) in (
              'genesis-standard',
              'genesis-high-performance',
              'machine-high-yield-film'
            )
            or c.slug ilike 'genesis%'
            or c.name ilike '%machine%'
            or c.name ilike '%automatic%'
          )
      )
      $c$
    else '' end,
    case when has_application then
      $s$ and lower(coalesce(p.application::text, '')) not in ('hand', 'manual') $s$
    else '' end,
    case when has_type then
      $s$ and lower(coalesce(p.type::text, '')) not in ('hand', 'manual') $s$
    else '' end
  );

  execute unauthorized_sql;

  -- Drop non-canonical duplicates of an official fingerprint when a canonical row exists.
  execute $sql$
    insert into _unauthorized_automatic_ids (id)
    select p.id
    from public.products p
    join _authorized_automatic_ids a on a.id = p.id
    where not (
      p.slug in (
        'stretch-film-20-x-51-ga-x-7000ft',
        'stretch-film-20-x-51-ga-x-9000ft',
        'stretch-film-20-x-70-ga-x-5000ft',
        'stretch-film-20-x-80-ga-x-5000ft'
      )
      or upper(replace(coalesce(p.part_number, ''), '-', '')) in (
        'HPFSF205170', 'HPFSF205190', 'HPFSF207050', 'HPFSF208050'
      )
    )
    and exists (
      select 1
      from public.products keep
      where keep.id <> p.id
        and (
          keep.slug in (
            'stretch-film-20-x-51-ga-x-7000ft',
            'stretch-film-20-x-51-ga-x-9000ft',
            'stretch-film-20-x-70-ga-x-5000ft',
            'stretch-film-20-x-80-ga-x-5000ft'
          )
          or upper(replace(coalesce(keep.part_number, ''), '-', '')) in (
            'HPFSF205170', 'HPFSF205190', 'HPFSF207050', 'HPFSF208050'
          )
        )
        and round(coalesce(keep.width_inches, 0)::numeric) = round(coalesce(p.width_inches, 0)::numeric)
        and round(coalesce(keep.gauge, 0)::numeric) = round(coalesce(p.gauge, 0)::numeric)
        and round(coalesce(keep.length_feet, 0)::numeric) = round(coalesce(p.length_feet, 0)::numeric)
    )
  $sql$;

  -- Best-effort dependent cleanup.
  if to_regclass('public.cart_items') is not null then
    execute 'delete from public.cart_items where product_id in (select id from _unauthorized_automatic_ids)';
  end if;
  if to_regclass('public.wishlist_items') is not null then
    execute 'delete from public.wishlist_items where product_id in (select id from _unauthorized_automatic_ids)';
  end if;
  if to_regclass('public.product_images') is not null then
    execute 'delete from public.product_images where product_id in (select id from _unauthorized_automatic_ids)';
  end if;

  execute 'delete from public.product_variants v where v.product_id in (select id from _unauthorized_automatic_ids)';
  execute 'delete from public.products p where p.id in (select id from _unauthorized_automatic_ids)';

  -- Strip non-20/40 variants on the four masters.
  execute $sql$
    delete from public.product_variants v
    using public.products p
    where v.product_id = p.id
      and (
        p.slug in (
          'stretch-film-20-x-51-ga-x-7000ft',
          'stretch-film-20-x-51-ga-x-9000ft',
          'stretch-film-20-x-70-ga-x-5000ft',
          'stretch-film-20-x-80-ga-x-5000ft'
        )
        or upper(replace(coalesce(p.part_number, ''), '-', '')) in (
          'HPFSF205170', 'HPFSF205190', 'HPFSF207050', 'HPFSF208050'
        )
      )
      and not (
        coalesce(v.rolls_count, 0) in (20, 40)
        or v.sku ilike '%-HLP'
        or v.sku ilike '%-FLP'
        or v.sku ilike '%-20R'
        or v.sku ilike '%-40R'
      )
  $sql$;

  execute $sql$
    update public.products p
    set is_active = true
    where p.slug in (
        'stretch-film-20-x-51-ga-x-7000ft',
        'stretch-film-20-x-51-ga-x-9000ft',
        'stretch-film-20-x-70-ga-x-5000ft',
        'stretch-film-20-x-80-ga-x-5000ft'
      )
      or upper(replace(coalesce(p.part_number, ''), '-', '')) in (
        'HPFSF205170', 'HPFSF205190', 'HPFSF207050', 'HPFSF208050'
      )
  $sql$;
end $$;
