-- Plastipac USA Free Sample Requests
-- Run in Supabase SQL Editor

create table if not exists public.sample_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  company_name text not null,
  work_email text not null,
  shipping_zip text,
  shipping_address text,
  film_type text not null check (film_type in ('hand', 'machine')),
  product_slug text,
  product_name text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists sample_requests_email_idx on public.sample_requests (work_email);
create index if not exists sample_requests_created_idx on public.sample_requests (created_at desc);

alter table public.sample_requests enable row level security;

drop policy if exists "Anyone can submit sample requests" on public.sample_requests;
create policy "Anyone can submit sample requests"
  on public.sample_requests
  for insert
  with check (true);

drop policy if exists "Admins read sample requests" on public.sample_requests;
create policy "Admins read sample requests"
  on public.sample_requests
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
