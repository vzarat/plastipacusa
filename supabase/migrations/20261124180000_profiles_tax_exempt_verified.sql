-- Ensure tax verification flag exists for customer dossier / checkout.
alter table public.profiles
  add column if not exists tax_exempt_verified boolean not null default false;

comment on column public.profiles.tax_exempt_verified is
  'Admin-verified sales-tax exemption for the registered B2B customer.';
