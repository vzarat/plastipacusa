-- FINAL hard purge: remove every Automatic/machine stretch film product that is
-- NOT one of the 4 official masters (20/40-roll variants only).
-- Kills ghosts: 60 GA / 63 GA / 6000 FT, "No Part #", unpriced orphans.
-- Manual 12"/15"/18" hand film is never touched. Safe to re-run.
-- Column-safe (title/name/application/type/rolls_count may be missing).

do $$
declare
  has_name boolean;
  has_application boolean;
  has_type boolean;
  has_title boolean;
  has_rolls_count boolean;
  has_categories boolean;
  machine_signal text := '';
  text_cols text := '';
  hand_guard text := '';
  unauthorized_sql text;
  variant_keep text;
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
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_variants' and column_name = 'rolls_count'
  ) into has_rolls_count;
  select to_regclass('public.categories') is not null into has_categories;

  -- Keep canonical slug / part, or exact official 20×gauge×length fingerprint.
  execute $sql$
    create temporary table _keep_automatic on commit drop as
    select p.id
    from public.products p
    where p.slug in (
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

  if has_application then
    machine_signal := machine_signal ||
      $s$ or lower(coalesce(p.application::text, '')) in ('machine', 'automatic') $s$;
    hand_guard := hand_guard ||
      $s$ and lower(coalesce(p.application::text, '')) not in ('hand', 'manual') $s$;
  end if;
  if has_type then
    machine_signal := machine_signal ||
      $s$ or lower(coalesce(p.type::text, '')) in ('machine', 'automatic') $s$;
    hand_guard := hand_guard ||
      $s$ and lower(coalesce(p.type::text, '')) not in ('hand', 'manual') $s$;
  end if;
  if has_title then
    text_cols := text_cols ||
      $s$
      or coalesce(p.title, '') ilike '%machine%'
      or coalesce(p.title, '') ilike '%automatic%'
      or coalesce(p.title, '') ilike '%genesis%'
      or coalesce(p.title, '') ~* '20"?[[:space:]]*X[[:space:]]*60[[:space:]]*GA'
      or coalesce(p.title, '') ~* '20"?[[:space:]]*X[[:space:]]*63[[:space:]]*GA'
      or coalesce(p.title, '') ~* '20"?[[:space:]]*X[[:space:]]*[0-9]+[[:space:]]*GA[[:space:]]*X[[:space:]]*6000'
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
      or coalesce(p.name, '') ~* '20"?[[:space:]]*X[[:space:]]*[0-9]+[[:space:]]*GA[[:space:]]*X[[:space:]]*6000'
      or coalesce(p.name, '') ~* '6000[[:space:]]*FT'
      $s$;
  end if;

  unauthorized_sql := format($sql$
    create temporary table _purge_automatic on commit drop as
    select p.id
    from public.products p
    where p.id not in (select id from _keep_automatic)
      and (
        -- Any 20" row that is not a kept master
        round(coalesce(p.width_inches, 0)::numeric) = 20
        or coalesce(p.slug, '') ilike 'stretch-film-20%%'
        or coalesce(p.slug, '') ilike '%%genesis%%'
        or coalesce(p.slug, '') ilike '%%-20-x-%%'
        or coalesce(p.slug, '') ilike '%%6000ft%%'
        or coalesce(p.slug, '') ~* '(^|[^0-9])(60|63)-ga'
        or coalesce(p.part_number, '') ilike 'HPF-SF%%'
        or coalesce(p.part_number, '') ilike 'HPFSF%%'
        or lower(trim(coalesce(p.part_number, ''))) in ('no part #', 'no part', 'n/a', 'na', '-')
        or (
          round(coalesce(p.width_inches, 0)::numeric) = 20
          and (
            round(coalesce(p.gauge, 0)::numeric) in (60, 63)
            or round(coalesce(p.length_feet, 0)::numeric) = 6000
            -- empty part # on any other 20" row (not an official fingerprint)
            or nullif(trim(coalesce(p.part_number, '')), '') is null
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
    hand_guard
  );

  execute unauthorized_sql;

  -- When a canonical slug/part row exists for a fingerprint, drop dim-only duplicates.
  execute $sql$
    insert into _purge_automatic (id)
    select p.id
    from public.products p
    join _keep_automatic k on k.id = p.id
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
      select 1 from public.products keep
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

  -- Best-effort dependents
  if to_regclass('public.cart_items') is not null then
    execute 'delete from public.cart_items where product_id in (select id from _purge_automatic)';
  end if;
  if to_regclass('public.wishlist_items') is not null then
    execute 'delete from public.wishlist_items where product_id in (select id from _purge_automatic)';
  end if;
  if to_regclass('public.product_images') is not null then
    execute 'delete from public.product_images where product_id in (select id from _purge_automatic)';
  end if;

  -- Soft-null order line product refs when FK would block hard delete
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'order_items' and column_name = 'product_id'
  ) then
    begin
      execute 'update public.order_items set product_id = null where product_id in (select id from _purge_automatic)';
    exception when others then
      -- Column may be NOT NULL; continue — product delete may still succeed if no FK
      null;
    end;
  end if;

  execute 'delete from public.product_variants where product_id in (select id from _purge_automatic)';
  execute 'delete from public.products where id in (select id from _purge_automatic)';

  -- Keep only HLP/FLP (20/40) variants on the four masters
  variant_keep := $k$
    v.sku ilike '%-HLP'
    or v.sku ilike '%-FLP'
    or v.sku ilike '%-20R'
    or v.sku ilike '%-40R'
  $k$;
  if has_rolls_count then
    variant_keep := 'coalesce(v.rolls_count, 0) in (20, 40) or ' || variant_keep;
  end if;

  execute format($sql$
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
      and not (%s)
  $sql$, variant_keep);

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

-- Verification (optional): should return only the 4 masters among 20"/machine rows.
-- select slug, part_number, width_inches, gauge, length_feet, price_usd
-- from public.products
-- where round(coalesce(width_inches,0)) = 20
--    or slug ilike 'stretch-film-20%'
-- order by gauge, length_feet;
