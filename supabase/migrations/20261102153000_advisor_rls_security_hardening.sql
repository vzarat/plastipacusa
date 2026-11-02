-- Fix Supabase Advisor Critical / Warning findings:
-- 1) Enable RLS + policies on catalog tables (products, categories, coupons, product_variants)
-- 2) Wrap auth.uid() as (select auth.uid()) on profiles, orders, shipping_addresses
-- 3) Pin search_path on public.handle_new_user
--
-- Note: this project uses profiles.role = 'admin' (not is_admin). Admin write
-- checks use role = 'admin' so existing admin accounts keep write access.

begin;

-- ---------------------------------------------------------------------------
-- 1) Catalog tables: enable RLS, public SELECT, admin/service_role writes
-- ---------------------------------------------------------------------------
alter table if exists public.products enable row level security;
alter table if exists public.categories enable row level security;
alter table if exists public.coupons enable row level security;
alter table if exists public.product_variants enable row level security;

do $$
declare
  t text;
  pol record;
begin
  foreach t in array array['products', 'categories', 'coupons', 'product_variants']
  loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    for pol in
      select p.polname
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t
    loop
      execute format('drop policy if exists %I on public.%I', pol.polname, t);
    end loop;

    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_select_public',
      t
    );

    -- Writes: service_role JWT or profiles.role = 'admin'
    execute format(
      $sql$
      create policy %I on public.%I
        for all
        to authenticated
        using (
          (auth.jwt() ->> 'role') = 'service_role'
          or exists (
            select 1
            from public.profiles p
            where p.id = (select auth.uid())
              and p.role = 'admin'
          )
        )
        with check (
          (auth.jwt() ->> 'role') = 'service_role'
          or exists (
            select 1
            from public.profiles p
            where p.id = (select auth.uid())
              and p.role = 'admin'
          )
        )
      $sql$,
      t || '_write_admin',
      t
    );
  end loop;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['products', 'categories', 'product_variants', 'coupons']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('grant select on table public.%I to anon, authenticated', t);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Optimize Auth RLS InitPlan: wrap auth.uid() → (select auth.uid())
--    on profiles, orders, shipping_addresses (preserve existing policy intent)
-- ---------------------------------------------------------------------------
do $$
declare
  pol record;
  new_using text;
  new_check text;
  ddl text;
  roles_clause text;
begin
  for pol in
    select
      c.relname as tablename,
      p.polname as policyname,
      case p.polcmd
        when 'r' then 'SELECT'
        when 'a' then 'INSERT'
        when 'w' then 'UPDATE'
        when 'd' then 'DELETE'
        when '*' then 'ALL'
      end as cmd,
      case when p.polpermissive then 'PERMISSIVE' else 'RESTRICTIVE' end as permissive,
      pg_get_expr(p.polqual, p.polrelid) as using_expr,
      pg_get_expr(p.polwithcheck, p.polrelid) as check_expr,
      coalesce(
        (
          select string_agg(quote_ident(r.rolname), ', ' order by r.rolname)
          from unnest(p.polroles) as rid
          join pg_roles r on r.oid = rid
        ),
        ''
      ) as roles
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('profiles', 'orders', 'shipping_addresses')
  loop
    new_using := pol.using_expr;
    new_check := pol.check_expr;

    if new_using is not null then
      new_using := replace(new_using, '(select auth.uid())', '__AUTH_UID_WRAPPED__');
      new_using := replace(new_using, 'auth.uid()', '(select auth.uid())');
      new_using := replace(new_using, '__AUTH_UID_WRAPPED__', '(select auth.uid())');
    end if;

    if new_check is not null then
      new_check := replace(new_check, '(select auth.uid())', '__AUTH_UID_WRAPPED__');
      new_check := replace(new_check, 'auth.uid()', '(select auth.uid())');
      new_check := replace(new_check, '__AUTH_UID_WRAPPED__', '(select auth.uid())');
    end if;

    -- Skip recreate when nothing changed
    if new_using is not distinct from pol.using_expr
       and new_check is not distinct from pol.check_expr then
      continue;
    end if;

    execute format(
      'drop policy if exists %I on public.%I',
      pol.policyname,
      pol.tablename
    );

    roles_clause := case
      when pol.roles = '' then 'public'
      else pol.roles
    end;

    ddl := format(
      'create policy %I on public.%I as %s for %s to %s',
      pol.policyname,
      pol.tablename,
      pol.permissive,
      pol.cmd,
      roles_clause
    );

    if pol.cmd in ('SELECT', 'UPDATE', 'DELETE', 'ALL') and new_using is not null then
      ddl := ddl || format(' using (%s)', new_using);
    end if;

    if pol.cmd in ('INSERT', 'UPDATE', 'ALL') then
      if new_check is not null then
        ddl := ddl || format(' with check (%s)', new_check);
      elsif pol.cmd = 'INSERT' and new_using is not null then
        ddl := ddl || format(' with check (%s)', new_using);
      end if;
    end if;

    execute ddl;
  end loop;
end;
$$;

-- Ensure shipping_addresses owner policy uses the InitPlan-safe form even if
-- no prior policy existed / rename drift.
do $$
begin
  if to_regclass('public.shipping_addresses') is null then
    return;
  end if;

  if not exists (
    select 1
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'shipping_addresses'
  ) then
    create policy "Users manage own shipping addresses"
      on public.shipping_addresses
      for all
      to authenticated
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Secure function search_path on handle_new_user
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'handle_new_user'
  loop
    execute format(
      'alter function public.handle_new_user(%s) set search_path = public',
      r.args
    );
  end loop;
end;
$$;

commit;
