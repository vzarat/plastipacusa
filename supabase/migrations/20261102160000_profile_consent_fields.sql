-- Optional consent fields captured at customer registration.
alter table public.profiles
  add column if not exists terms_accepted_at timestamptz;

alter table public.profiles
  add column if not exists marketing_opt_in boolean not null default false;

comment on column public.profiles.terms_accepted_at is
  'Timestamp when the customer accepted Terms of Service / Privacy Policy at signup.';

comment on column public.profiles.marketing_opt_in is
  'Customer opted in to commercial / promotional email at the registered address.';
