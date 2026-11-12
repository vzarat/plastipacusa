-- Commercial credit: ensure profile credit columns, available balance + payment_terms,
-- plus unpaid B2B invoice ledger for Net 30 checkout.
-- Safe to re-run if a previous attempt failed mid-script.

-- ---------------------------------------------------------------------------
-- Profiles: credit foundation (may be missing if profiles_b2b.sql was never applied)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists credit_application_status text default 'pending';

alter table public.profiles
  add column if not exists credit_limit numeric not null default 0;

alter table public.profiles
  add column if not exists credit_terms text default 'Registered';

alter table public.profiles
  add column if not exists available_credit numeric not null default 0;

alter table public.profiles
  add column if not exists payment_terms text default 'Registered';

-- Constrain status values when constraint is absent.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_credit_application_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_credit_application_status_check
      check (credit_application_status in ('pending', 'approved', 'rejected'));
  end if;
exception
  when duplicate_object then null;
  when check_violation then null;
end $$;

-- Backfill payment_terms from credit_terms when still at default.
update public.profiles
set payment_terms = coalesce(nullif(trim(credit_terms), ''), payment_terms, 'Registered')
where payment_terms is null
   or payment_terms = 'Registered';

-- Approved accounts with a limit but zero available_credit: seed remaining balance.
update public.profiles
set available_credit = greatest(0, coalesce(credit_limit, 0))
where lower(coalesce(credit_application_status, '')) = 'approved'
  and coalesce(available_credit, 0) = 0
  and coalesce(credit_limit, 0) > 0;

-- ---------------------------------------------------------------------------
-- company_profiles (optional table)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.company_profiles') is not null then
    alter table public.company_profiles
      add column if not exists credit_application_status text default 'pending';
    alter table public.company_profiles
      add column if not exists credit_limit numeric not null default 0;
    alter table public.company_profiles
      add column if not exists credit_terms text default 'Registered';
    alter table public.company_profiles
      add column if not exists available_credit numeric not null default 0;
    alter table public.company_profiles
      add column if not exists payment_terms text default 'Registered';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Unpaid B2B invoice ledger
-- ---------------------------------------------------------------------------
create table if not exists public.b2b_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  order_id uuid,
  invoice_number text,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD',
  status text not null default 'unpaid'
    check (status in ('unpaid', 'partial', 'paid', 'void', 'overdue')),
  payment_terms text not null default 'Net 30',
  due_date date,
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Soft-link to orders when the orders table / id type allows it.
do $$
begin
  if to_regclass('public.orders') is not null
     and not exists (
       select 1 from pg_constraint
       where conname = 'b2b_invoices_order_id_fkey'
         and conrelid = 'public.b2b_invoices'::regclass
     ) then
    begin
      alter table public.b2b_invoices
        add constraint b2b_invoices_order_id_fkey
        foreign key (order_id) references public.orders (id) on delete set null;
    exception
      when others then
        raise notice 'Skipping b2b_invoices.order_id FK: %', SQLERRM;
    end;
  end if;
end $$;

create index if not exists b2b_invoices_user_id_idx on public.b2b_invoices (user_id);
create index if not exists b2b_invoices_status_idx on public.b2b_invoices (status);
create index if not exists b2b_invoices_order_id_idx on public.b2b_invoices (order_id);

alter table public.b2b_invoices enable row level security;

drop policy if exists "Users read own b2b invoices" on public.b2b_invoices;
create policy "Users read own b2b invoices"
  on public.b2b_invoices
  for select
  using (auth.uid() = user_id);

drop policy if exists "Admins manage b2b invoices" on public.b2b_invoices;
create policy "Admins manage b2b invoices"
  on public.b2b_invoices
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

-- Atomically deduct available credit when placing a Net 30 order.
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
grant execute on function public.deduct_available_credit(uuid, numeric) to authenticated;
grant execute on function public.deduct_available_credit(uuid, numeric) to service_role;
