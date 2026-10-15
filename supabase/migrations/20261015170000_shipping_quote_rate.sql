-- Shipping quote rate limit. Not applied by the app.
-- ip_hash stores sha256(ip) plus a window suffix so the 10-minute and daily rows never share a key.
-- The suffix is added here. The route hashes the IP and does not store the address.

create table if not exists public.shipping_quote_limits (
  ip_hash text not null,
  window_start timestamptz not null,
  count integer not null,
  primary key (ip_hash, window_start)
);

alter table public.shipping_quote_limits enable row level security;

revoke all on table public.shipping_quote_limits from anon;
revoke all on table public.shipping_quote_limits from authenticated;

create or replace function public.consume_shipping_quote_limit(
  p_ip_hash text,
  p_burst_limit integer,
  p_day_limit integer,
  p_burst_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_burst timestamptz;
  v_day timestamptz;
  v_burst_count integer;
  v_day_count integer;
begin
  if p_ip_hash is null or btrim(p_ip_hash) = '' then
    return false;
  end if;
  if p_burst_seconds is null or p_burst_seconds < 1 then
    return false;
  end if;

  delete from public.shipping_quote_limits
  where window_start < v_now - interval '1 day';

  v_burst := to_timestamp(floor(extract(epoch from v_now) / p_burst_seconds) * p_burst_seconds);
  v_day := date_trunc('day', v_now);

  insert into public.shipping_quote_limits (ip_hash, window_start, count)
  values (p_ip_hash || ':10m', v_burst, 1)
  on conflict (ip_hash, window_start)
  do update set count = public.shipping_quote_limits.count + 1
  returning count into v_burst_count;

  insert into public.shipping_quote_limits (ip_hash, window_start, count)
  values (p_ip_hash || ':1d', v_day, 1)
  on conflict (ip_hash, window_start)
  do update set count = public.shipping_quote_limits.count + 1
  returning count into v_day_count;

  return v_burst_count <= p_burst_limit and v_day_count <= p_day_limit;
end;
$$;

revoke all on function public.consume_shipping_quote_limit(text, integer, integer, integer) from public;
revoke all on function public.consume_shipping_quote_limit(text, integer, integer, integer) from anon;
revoke all on function public.consume_shipping_quote_limit(text, integer, integer, integer) from authenticated;
grant execute on function public.consume_shipping_quote_limit(text, integer, integer, integer) to service_role;
