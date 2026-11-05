-- Create + harden public.credit_applications (safe to re-run).

create table if not exists public.credit_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  company_name text not null,
  contact_name text not null,
  work_email text not null,
  phone text not null,
  tax_id_ein text not null,
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

-- Backfill columns if an older table already existed without them
alter table public.credit_applications
  add column if not exists user_id uuid references auth.users (id) on delete set null;

alter table public.credit_applications
  add column if not exists reviewed_at timestamptz;

alter table public.credit_applications
  add column if not exists reviewed_by uuid references auth.users (id);

alter table public.credit_applications
  add column if not exists billing_address text;

alter table public.credit_applications
  add column if not exists shipping_address text;

alter table public.credit_applications
  add column if not exists annual_volume text;

alter table public.credit_applications
  add column if not exists credit_reference_1 text;

alter table public.credit_applications
  add column if not exists credit_reference_2 text;

alter table public.credit_applications
  add column if not exists credit_reference_3 text;

alter table public.credit_applications
  add column if not exists notes text;

create index if not exists credit_applications_email_idx
  on public.credit_applications (work_email);

create index if not exists credit_applications_created_idx
  on public.credit_applications (created_at desc);

create index if not exists credit_applications_status_idx
  on public.credit_applications (status);

create index if not exists credit_applications_user_id_idx
  on public.credit_applications (user_id);

alter table public.credit_applications enable row level security;

-- Public / anon can submit applications
drop policy if exists "Anyone can submit credit applications" on public.credit_applications;
create policy "Anyone can submit credit applications"
  on public.credit_applications
  for insert
  with check (true);

-- Applicants can see their own rows
drop policy if exists "Users read own credit applications" on public.credit_applications;
create policy "Users read own credit applications"
  on public.credit_applications
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or lower(work_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

-- Admins can read all applications
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

-- Admins can approve / reject
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
