-- Plastipac USA B2B Credit Applications
-- Run in Supabase SQL Editor

create table if not exists public.credit_applications (
  id uuid primary key default gen_random_uuid(),
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
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists credit_applications_email_idx
  on public.credit_applications (work_email);
create index if not exists credit_applications_created_idx
  on public.credit_applications (created_at desc);
create index if not exists credit_applications_status_idx
  on public.credit_applications (status);

alter table public.credit_applications enable row level security;

drop policy if exists "Anyone can submit credit applications" on public.credit_applications;
create policy "Anyone can submit credit applications"
  on public.credit_applications
  for insert
  with check (true);

drop policy if exists "Admins read credit applications" on public.credit_applications;
create policy "Admins read credit applications"
  on public.credit_applications
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
