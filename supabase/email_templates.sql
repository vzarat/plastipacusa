-- Plastipac USA: transactional email template storage for Admin → Email Templates
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null default 'Order Confirmation',
  subject text not null,
  logo_url text,
  primary_color text,
  navy_color text,
  background_color text,
  panel_color text,
  text_color text,
  muted_color text,
  greeting_prefix text,
  main_message text,
  cta_label text,
  cta_url text,
  footer_sales_email text,
  footer_support_phone_us text,
  footer_support_phone_mx text,
  footer_address text,
  footer_website text,
  legal_disclaimer text,
  from_address text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.email_templates enable row level security;
