-- Deduplicate Automatic/machine film: keep exactly one product per official
-- master (20x51x7000, 20x51x9000, 20x70x5000, 20x80x5000). Prefer official
-- slug + GENESIS title. Drop STRETCH FILM ghost clones that share the same
-- HPF-SF part numbers. Manual hand film is never touched. Safe to re-run.
-- Column-safe (title/name/application/rolls_count may be missing).

do $$
declare
  has_name boolean;
  has_title boolean;
  has_application boolean;
  has_rolls_count boolean;
  has_is_active boolean;
  has_created_at boolean;
  display_expr text := '''''::text';
  genesis_score text := '0';
  genesis_where text := 'false';
  application_where text := 'false';
  active_score text := '0';
  created_expr text := 'null::timestamptz';
  fingerprint_sql text;
  normalize_set text;
  variant_keep text;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'name'
  ) into has_name;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'title'
  ) into has_title;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'application'
  ) into has_application;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'product_variants' and column_name = 'rolls_count'
  ) into has_rolls_count;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'is_active'
  ) into has_is_active;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'created_at'
  ) into has_created_at;

  if has_title and has_name then
    display_expr := 'coalesce(p.title, p.name, '''')';
  elsif has_title then
    display_expr := 'coalesce(p.title, '''')';
  elsif has_name then
    display_expr := 'coalesce(p.name, '''')';
  end if;

  genesis_score := format(
    'case when %s ilike %L then 20 else 0 end',
    display_expr,
    '%genesis%'
  );
  genesis_where := format('%s ilike %L', display_expr, '%genesis%');

  if has_application then
    application_where :=
      'lower(coalesce(p.application::text, '''')) in (''machine'', ''automatic'')';
  end if;

  if has_is_active then
    active_score := 'case when coalesce(p.is_active, false) then 5 else 0 end';
  end if;

  if has_created_at then
    created_expr := 'p.created_at';
  end if;

  fingerprint_sql := format($sql$
    create temporary table _automatic_fingerprint on commit drop as
    select
      p.id,
      case
        when round(coalesce(p.width_inches, 0)::numeric) = 20
          and round(coalesce(p.gauge, 0)::numeric) = 51
          and round(coalesce(p.length_feet, 0)::numeric) = 7000
          then 'stretch-film-20-x-51-ga-x-7000ft'
        when round(coalesce(p.width_inches, 0)::numeric) = 20
          and round(coalesce(p.gauge, 0)::numeric) = 51
          and round(coalesce(p.length_feet, 0)::numeric) = 9000
          then 'stretch-film-20-x-51-ga-x-9000ft'
        when round(coalesce(p.width_inches, 0)::numeric) = 20
          and round(coalesce(p.gauge, 0)::numeric) = 70
          and round(coalesce(p.length_feet, 0)::numeric) = 5000
          then 'stretch-film-20-x-70-ga-x-5000ft'
        when round(coalesce(p.width_inches, 0)::numeric) = 20
          and round(coalesce(p.gauge, 0)::numeric) = 80
          and round(coalesce(p.length_feet, 0)::numeric) = 5000
          then 'stretch-film-20-x-80-ga-x-5000ft'
        when upper(replace(coalesce(p.part_number, ''), '-', '')) = 'HPFSF205170'
          then 'stretch-film-20-x-51-ga-x-7000ft'
        when upper(replace(coalesce(p.part_number, ''), '-', '')) = 'HPFSF205190'
          then 'stretch-film-20-x-51-ga-x-9000ft'
        when upper(replace(coalesce(p.part_number, ''), '-', '')) = 'HPFSF207050'
          then 'stretch-film-20-x-70-ga-x-5000ft'
        when upper(replace(coalesce(p.part_number, ''), '-', '')) = 'HPFSF208050'
          then 'stretch-film-20-x-80-ga-x-5000ft'
        else null
      end as master_slug,
      (
        case
          when p.slug in (
            'stretch-film-20-x-51-ga-x-7000ft',
            'stretch-film-20-x-51-ga-x-9000ft',
            'stretch-film-20-x-70-ga-x-5000ft',
            'stretch-film-20-x-80-ga-x-5000ft'
          ) then 100
          else 0
        end
        + case
            when upper(replace(coalesce(p.part_number, ''), '-', '')) in (
              'HPFSF205170', 'HPFSF205190', 'HPFSF207050', 'HPFSF208050'
            ) then 40
            else 0
          end
        + %s
        + %s
      ) as keep_score,
      %s as created_at
    from public.products p
    where
      %s
      or p.slug ilike 'stretch-film-20%%'
      or coalesce(p.part_number, '') ilike 'HPF-SF%%'
      or %s
      or (
        round(coalesce(p.width_inches, 0)::numeric) = 20
        and round(coalesce(p.gauge, 0)::numeric) in (51, 70, 80)
      )
  $sql$,
    genesis_score,
    active_score,
    created_expr,
    application_where,
    genesis_where
  );

  execute fingerprint_sql;

  -- Drop any Automatic row that does not map to an official master fingerprint.
  execute $sql$
    create temporary table _purge_dup_automatic on commit drop as
    select f.id
    from _automatic_fingerprint f
    where f.master_slug is null
  $sql$;

  -- Within each master fingerprint, keep the highest-scoring row only.
  execute $sql$
    insert into _purge_dup_automatic (id)
    select f.id
    from _automatic_fingerprint f
    where f.master_slug is not null
      and f.id not in (
        select distinct on (master_slug) id
        from _automatic_fingerprint
        where master_slug is not null
        order by master_slug, keep_score desc, created_at asc nulls last, id asc
      )
  $sql$;

  if to_regclass('public.cart_items') is not null then
    execute 'delete from public.cart_items where product_id in (select id from _purge_dup_automatic)';
  end if;
  if to_regclass('public.wishlist_items') is not null then
    execute 'delete from public.wishlist_items where product_id in (select id from _purge_dup_automatic)';
  end if;
  if to_regclass('public.product_images') is not null then
    execute 'delete from public.product_images where product_id in (select id from _purge_dup_automatic)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'order_items' and column_name = 'product_id'
  ) then
    begin
      execute 'update public.order_items set product_id = null where product_id in (select id from _purge_dup_automatic)';
    exception when others then
      null;
    end;
  end if;

  execute 'delete from public.product_variants where product_id in (select id from _purge_dup_automatic)';
  execute 'delete from public.products where id in (select id from _purge_dup_automatic)';

  -- Normalize survivors to official slug / part / GENESIS naming.
  normalize_set :=
    'slug = m.master_slug, part_number = case m.master_slug
        when ''stretch-film-20-x-51-ga-x-7000ft'' then ''HPF-SF205170''
        when ''stretch-film-20-x-51-ga-x-9000ft'' then ''HPF-SF205190''
        when ''stretch-film-20-x-70-ga-x-5000ft'' then ''HPF-SF207050''
        when ''stretch-film-20-x-80-ga-x-5000ft'' then ''HPF-SF208050''
      end';

  if has_application then
    normalize_set := normalize_set || ', application = ''machine''';
  end if;
  if has_is_active then
    normalize_set := normalize_set || ', is_active = true';
  end if;

  if has_title then
    normalize_set := normalize_set || format(
      ', title = case when coalesce(p.title, '''') not ilike %L then case m.master_slug
          when ''stretch-film-20-x-51-ga-x-7000ft'' then ''GENESIS Machine Film 20" x 51 GA x 7000 FT''
          when ''stretch-film-20-x-51-ga-x-9000ft'' then ''GENESIS Machine Film 20" x 51 GA x 9000 FT''
          when ''stretch-film-20-x-70-ga-x-5000ft'' then ''GENESIS Machine Film 20" x 70 GA x 5000 FT''
          when ''stretch-film-20-x-80-ga-x-5000ft'' then ''GENESIS Machine Film 20" x 80 GA x 5000 FT''
        end else p.title end',
      '%genesis%'
    );
  end if;

  if has_name then
    normalize_set := normalize_set || format(
      ', name = case when coalesce(p.name, '''') not ilike %L then case m.master_slug
          when ''stretch-film-20-x-51-ga-x-7000ft'' then ''GENESIS Machine Film 20" x 51 GA x 7000 FT''
          when ''stretch-film-20-x-51-ga-x-9000ft'' then ''GENESIS Machine Film 20" x 51 GA x 9000 FT''
          when ''stretch-film-20-x-70-ga-x-5000ft'' then ''GENESIS Machine Film 20" x 70 GA x 5000 FT''
          when ''stretch-film-20-x-80-ga-x-5000ft'' then ''GENESIS Machine Film 20" x 80 GA x 5000 FT''
        end else p.name end',
      '%genesis%'
    );
  end if;

  execute format($sql$
    update public.products p
    set %s
    from (
      select distinct on (master_slug) id, master_slug
      from _automatic_fingerprint
      where master_slug is not null
        and id not in (select id from _purge_dup_automatic)
      order by master_slug, keep_score desc, created_at asc nulls last, id asc
    ) m
    where p.id = m.id
  $sql$, normalize_set);

  -- Keep only Half/Full (20/40) variants on survivors.
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
      and p.slug in (
        'stretch-film-20-x-51-ga-x-7000ft',
        'stretch-film-20-x-51-ga-x-9000ft',
        'stretch-film-20-x-70-ga-x-5000ft',
        'stretch-film-20-x-80-ga-x-5000ft'
      )
      and not (%s)
  $sql$, variant_keep);
end $$;
