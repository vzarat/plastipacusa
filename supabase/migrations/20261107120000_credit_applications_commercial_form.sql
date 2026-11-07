-- Expand credit_applications for full B2B commercial credit form + office review.

create table if not exists public.credit_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  company_name text not null default '',
  contact_name text not null default '',
  work_email text not null default '',
  phone text not null default '',
  tax_id_ein text not null default '',
  billing_address text,
  shipping_address text,
  annual_volume text,
  credit_reference_1 text,
  credit_reference_2 text,
  credit_reference_3 text,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- Request setup
alter table public.credit_applications add column if not exists application_date date default current_date;
alter table public.credit_applications add column if not exists credit_limit_requested numeric(12,2);
alter table public.credit_applications add column if not exists payment_terms_requested text;

-- Business information
alter table public.credit_applications add column if not exists legal_business_name text;
alter table public.credit_applications add column if not exists dba_name text;
alter table public.credit_applications add column if not exists years_in_business integer;
alter table public.credit_applications add column if not exists business_street text;
alter table public.credit_applications add column if not exists business_city text;
alter table public.credit_applications add column if not exists business_state text;
alter table public.credit_applications add column if not exists business_zip text;
alter table public.credit_applications add column if not exists billing_same_as_business boolean default true;
alter table public.credit_applications add column if not exists billing_street text;
alter table public.credit_applications add column if not exists billing_city text;
alter table public.credit_applications add column if not exists billing_state text;
alter table public.credit_applications add column if not exists billing_zip text;
alter table public.credit_applications add column if not exists website text;
alter table public.credit_applications add column if not exists business_type text;

-- Contacts
alter table public.credit_applications add column if not exists ap_contact_name text;
alter table public.credit_applications add column if not exists ap_phone text;
alter table public.credit_applications add column if not exists ap_email text;
alter table public.credit_applications add column if not exists purchasing_contact_name text;
alter table public.credit_applications add column if not exists purchasing_phone text;
alter table public.credit_applications add column if not exists purchasing_email text;

-- Trade references (3)
alter table public.credit_applications add column if not exists ref1_company_name text;
alter table public.credit_applications add column if not exists ref1_contact_person text;
alter table public.credit_applications add column if not exists ref1_phone text;
alter table public.credit_applications add column if not exists ref1_email text;
alter table public.credit_applications add column if not exists ref1_credit_terms text;

alter table public.credit_applications add column if not exists ref2_company_name text;
alter table public.credit_applications add column if not exists ref2_contact_person text;
alter table public.credit_applications add column if not exists ref2_phone text;
alter table public.credit_applications add column if not exists ref2_email text;
alter table public.credit_applications add column if not exists ref2_credit_terms text;

alter table public.credit_applications add column if not exists ref3_company_name text;
alter table public.credit_applications add column if not exists ref3_contact_person text;
alter table public.credit_applications add column if not exists ref3_phone text;
alter table public.credit_applications add column if not exists ref3_email text;
alter table public.credit_applications add column if not exists ref3_credit_terms text;

-- Bank
alter table public.credit_applications add column if not exists bank_name text;
alter table public.credit_applications add column if not exists bank_contact_person text;
alter table public.credit_applications add column if not exists bank_phone text;

-- Authorization / e-sign
alter table public.credit_applications add column if not exists authorized_representative_name text;
alter table public.credit_applications add column if not exists authorized_title text;
alter table public.credit_applications add column if not exists e_signature text;
alter table public.credit_applications add column if not exists signature_date date;

-- Office use only
alter table public.credit_applications add column if not exists approved_credit_limit numeric(12,2);
alter table public.credit_applications add column if not exists approved_payment_terms text;
alter table public.credit_applications add column if not exists approval_date timestamptz;
alter table public.credit_applications add column if not exists admin_comments text;

-- Backfill legal_business_name from company_name when empty
update public.credit_applications
set legal_business_name = company_name
where (legal_business_name is null or btrim(legal_business_name) = '')
  and company_name is not null
  and btrim(company_name) <> '';

create index if not exists credit_applications_status_idx
  on public.credit_applications (status);
create index if not exists credit_applications_created_idx
  on public.credit_applications (created_at desc);

alter table public.credit_applications enable row level security;

drop policy if exists "Anyone can submit credit applications" on public.credit_applications;
create policy "Anyone can submit credit applications"
  on public.credit_applications
  for insert
  with check (true);

drop policy if exists "Users read own credit applications" on public.credit_applications;
create policy "Users read own credit applications"
  on public.credit_applications
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or lower(work_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

drop policy if exists "Admins read credit applications" on public.credit_applications;
create policy "Admins read credit applications"
  on public.credit_applications
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  );

drop policy if exists "Admins update credit applications" on public.credit_applications;
create policy "Admins update credit applications"
  on public.credit_applications
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  );
