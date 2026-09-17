-- Plastipac USA Promo Codes
-- Run in Supabase SQL Editor

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  discount_percent numeric(5,2) not null check (discount_percent > 0 and discount_percent <= 100),
  target_type text not null check (target_type in ('global', 'width', 'gauge', 'category')),
  target_value text,
  bound_email text,
  max_uses integer,
  used_count integer not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_code_unique unique (code)
);

create index if not exists coupons_code_idx on public.coupons (code);
create index if not exists coupons_active_idx on public.coupons (is_active);

alter table public.coupons enable row level security;

drop policy if exists "Admins manage coupons" on public.coupons;
create policy "Admins manage coupons"
  on public.coupons
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

drop policy if exists "Authenticated can read active coupons for apply" on public.coupons;
create policy "Authenticated can read active coupons for apply"
  on public.coupons
  for select
  using (is_active = true);

-- Public/anon can call apply via RPC only
create or replace function public.apply_coupon(
  p_code text,
  p_user_email text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.coupons%rowtype;
  v_code text := upper(trim(coalesce(p_code, '')));
  v_email text := lower(trim(coalesce(p_user_email, '')));
begin
  if v_code = '' then
    return json_build_object('success', false, 'error', 'Please enter a promo code.');
  end if;

  select * into v_coupon
  from public.coupons
  where upper(code) = v_code
  limit 1;

  if not found then
    return json_build_object('success', false, 'error', 'Promo code not found.');
  end if;

  if v_coupon.is_active is not true then
    return json_build_object('success', false, 'error', 'This promo code is inactive.');
  end if;

  if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
    return json_build_object('success', false, 'error', 'This promo code has expired.');
  end if;

  if v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses then
    return json_build_object('success', false, 'error', 'This promo code has reached its usage limit.');
  end if;

  if v_coupon.bound_email is not null and length(trim(v_coupon.bound_email)) > 0 then
    if v_email = '' or lower(trim(v_coupon.bound_email)) <> v_email then
      return json_build_object('success', false, 'error', 'This promo code is locked to a specific customer email.');
    end if;
  end if;

  return json_build_object(
    'success', true,
    'coupon', json_build_object(
      'id', v_coupon.id,
      'code', v_coupon.code,
      'discount_percent', v_coupon.discount_percent,
      'target_type', v_coupon.target_type,
      'target_value', v_coupon.target_value,
      'bound_email', v_coupon.bound_email,
      'max_uses', v_coupon.max_uses,
      'used_count', v_coupon.used_count,
      'expires_at', v_coupon.expires_at,
      'is_active', v_coupon.is_active
    )
  );
end;
$$;

grant execute on function public.apply_coupon(text, text) to anon, authenticated;
