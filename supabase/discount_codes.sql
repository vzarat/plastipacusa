-- Plastipac USA Discount Codes
-- Run in Supabase SQL Editor

create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  discount_type text not null default 'percent'
    check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discount_codes_code_unique unique (code),
  constraint discount_codes_percent_range check (
    discount_type <> 'percent' or (discount_value > 0 and discount_value <= 100)
  )
);

-- Optional display label (aliases to `code` in the app when absent).
-- Safe on existing deployments that were created without this column.
alter table public.discount_codes
  add column if not exists name text;

-- Backfill name from code where missing
update public.discount_codes
set name = code
where name is null or btrim(name) = '';


create index if not exists discount_codes_code_idx on public.discount_codes (code);
create index if not exists discount_codes_active_idx on public.discount_codes (is_active);

alter table public.discount_codes enable row level security;

drop policy if exists "Admins manage discount_codes" on public.discount_codes;
create policy "Admins manage discount_codes"
  on public.discount_codes
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Public can read active discount_codes" on public.discount_codes;
create policy "Public can read active discount_codes"
  on public.discount_codes
  for select
  using (is_active = true);

create or replace function public.apply_discount_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.discount_codes%rowtype;
  v_code text := upper(trim(coalesce(p_code, '')));
begin
  if v_code = '' then
    return json_build_object('success', false, 'error', 'Please enter a discount code.');
  end if;

  select * into v_row
  from public.discount_codes
  where upper(code) = v_code
  limit 1;

  if not found then
    return json_build_object('success', false, 'error', 'Discount code not found.');
  end if;

  if v_row.is_active is not true then
    return json_build_object('success', false, 'error', 'This discount code is inactive.');
  end if;

  if v_row.expires_at is not null and v_row.expires_at < now() then
    return json_build_object('success', false, 'error', 'This discount code has expired.');
  end if;

  return json_build_object(
    'success', true,
    'discount', json_build_object(
      'id', v_row.id,
      'code', v_row.code,
      'name', coalesce(nullif(btrim(v_row.name), ''), v_row.code),
      'discount_type', v_row.discount_type,
      'discount_value', v_row.discount_value,
      'expires_at', v_row.expires_at,
      'is_active', v_row.is_active
    )
  );
end;
$$;

grant execute on function public.apply_discount_code(text) to anon, authenticated;
