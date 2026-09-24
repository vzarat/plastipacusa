-- Plastipac USA — B2B customer dossier fields on profiles
-- + private tax-certificates storage bucket
-- Run in Supabase SQL Editor

-- ---------------------------------------------------------------------------
-- Profiles: tax / credit onboarding columns
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists tax_id text;

alter table public.profiles
  add column if not exists is_tax_exempt boolean not null default false;

alter table public.profiles
  add column if not exists tax_exemption_number text;

alter table public.profiles
  add column if not exists tax_certificate_url text;

alter table public.profiles
  add column if not exists tax_exempt_verified boolean not null default false;

alter table public.profiles
  add column if not exists credit_application_status text
    default 'pending'
    check (credit_application_status in ('pending', 'approved', 'rejected'));

alter table public.profiles
  add column if not exists credit_limit numeric not null default 0;

alter table public.profiles
  add column if not exists credit_terms text default 'Registered';

alter table public.profiles
  add column if not exists phone text;

create index if not exists profiles_tax_id_idx on public.profiles (tax_id);
create index if not exists profiles_credit_status_idx
  on public.profiles (credit_application_status);

-- Optional 1:1 company dossier table (linked to auth.users)
create table if not exists public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  company_name text,
  tax_id text,
  is_tax_exempt boolean not null default false,
  tax_exemption_number text,
  tax_certificate_url text,
  tax_exempt_verified boolean not null default false,
  credit_application_status text
    default 'pending'
    check (credit_application_status in ('pending', 'approved', 'rejected')),
  credit_limit numeric not null default 0,
  credit_terms text default 'Registered',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_profiles_user_id_idx
  on public.company_profiles (user_id);

alter table public.company_profiles enable row level security;

drop policy if exists "Users manage own company profile" on public.company_profiles;
create policy "Users manage own company profile"
  on public.company_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins manage all company profiles" on public.company_profiles;
create policy "Admins manage all company profiles"
  on public.company_profiles
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

-- Link credit applications to auth users when known
alter table public.credit_applications
  add column if not exists user_id uuid references auth.users (id);

create index if not exists credit_applications_user_id_idx
  on public.credit_applications (user_id);

-- ---------------------------------------------------------------------------
-- Storage: tax-certificates (private)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tax-certificates',
  'tax-certificates',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own tax certificates" on storage.objects;
create policy "Users upload own tax certificates"
  on storage.objects
  for insert
  with check (
    bucket_id = 'tax-certificates'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users read own tax certificates" on storage.objects;
create policy "Users read own tax certificates"
  on storage.objects
  for select
  using (
    bucket_id = 'tax-certificates'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users update own tax certificates" on storage.objects;
create policy "Users update own tax certificates"
  on storage.objects
  for update
  using (
    bucket_id = 'tax-certificates'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Admins read tax certificates" on storage.objects;
create policy "Admins read tax certificates"
  on storage.objects
  for select
  using (
    bucket_id = 'tax-certificates'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins manage tax certificates" on storage.objects;
create policy "Admins manage tax certificates"
  on storage.objects
  for all
  using (
    bucket_id = 'tax-certificates'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
