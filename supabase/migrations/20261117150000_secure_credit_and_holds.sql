-- Harden commercial credit deduction: only service_role may call it.
-- Previously GRANT EXECUTE TO authenticated allowed any logged-in user to
-- drain another account's available_credit via p_user_id.

create or replace function public.deduct_available_credit(
  p_user_id uuid,
  p_amount numeric
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining numeric;
begin
  -- Block direct authenticated callers spoofing another user id.
  -- service_role has auth.uid() IS NULL and remains allowed.
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Forbidden credit deduction';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid credit deduction amount';
  end if;

  update public.profiles
  set available_credit = available_credit - p_amount
  where id = p_user_id
    and lower(coalesce(credit_application_status, '')) = 'approved'
    and available_credit >= p_amount
  returning available_credit into v_remaining;

  if v_remaining is null then
    raise exception 'Insufficient available credit or account not approved';
  end if;

  return v_remaining;
end;
$$;

revoke all on function public.deduct_available_credit(uuid, numeric) from public;
revoke all on function public.deduct_available_credit(uuid, numeric) from anon;
revoke all on function public.deduct_available_credit(uuid, numeric) from authenticated;
grant execute on function public.deduct_available_credit(uuid, numeric) to service_role;
