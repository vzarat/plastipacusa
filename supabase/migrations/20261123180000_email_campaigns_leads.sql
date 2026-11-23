-- Email campaigns, lead capture, and opt-out tracking.

create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  company_name text not null default '',
  contact_name text not null default '',
  phone text not null default '',
  zip_code text not null default '',
  source text not null default 'manual'
    check (source in ('manual', 'csv', 'facebook', 'inquiry', 'import')),
  tags text[] not null default '{}',
  status text not null default 'new'
    check (status in ('new', 'contacted', 'qualified', 'converted', 'archived')),
  subscribed boolean not null default true,
  unsubscribe_token text not null default encode(gen_random_bytes(24), 'hex'),
  external_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists leads_email_uidx
  on public.leads (lower(email));

create unique index if not exists leads_unsubscribe_token_uidx
  on public.leads (unsubscribe_token);

create index if not exists leads_subscribed_idx
  on public.leads (subscribed)
  where subscribed = true;

create index if not exists leads_tags_gin_idx
  on public.leads using gin (tags);

create index if not exists leads_source_created_idx
  on public.leads (source, created_at desc);

create unique index if not exists leads_external_id_uidx
  on public.leads (external_id)
  where external_id is not null;

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'broadcast'
    check (type in ('broadcast', 'sequence')),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  subject text not null default '',
  preview_text text not null default '',
  html_body text not null default '',
  text_body text not null default '',
  segment_tags text[] not null default '{}',
  from_address text not null default 'Plastipac USA <contact@plastipacusa.com>',
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  sequence_steps jsonb not null default '[]'::jsonb,
  sent_count integer not null default 0,
  delivered_count integer not null default 0,
  open_count integer not null default 0,
  click_count integer not null default 0,
  unsubscribe_count integer not null default 0,
  bounce_count integer not null default 0,
  failed_count integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_status_created_idx
  on public.campaigns (status, created_at desc);

create table if not exists public.campaign_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  email text not null,
  step_index integer not null default 0,
  send_after timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'delivered', 'failed', 'skipped', 'bounced')),
  resend_id text,
  unsubscribe_token text not null default encode(gen_random_bytes(24), 'hex'),
  error text,
  open_count integer not null default 0,
  click_count integer not null default 0,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists campaign_sends_unsub_token_uidx
  on public.campaign_sends (unsubscribe_token);

create index if not exists campaign_sends_dispatch_idx
  on public.campaign_sends (status, send_after)
  where status = 'pending';

create index if not exists campaign_sends_campaign_idx
  on public.campaign_sends (campaign_id, status);

create unique index if not exists campaign_sends_campaign_lead_step_uidx
  on public.campaign_sends (campaign_id, lead_id, step_index)
  where lead_id is not null;

create index if not exists campaign_sends_resend_id_idx
  on public.campaign_sends (resend_id)
  where resend_id is not null;

alter table public.leads enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_sends enable row level security;

drop policy if exists "Admins manage leads" on public.leads;
create policy "Admins manage leads"
  on public.leads
  for all
  to authenticated
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

drop policy if exists "Admins manage campaigns" on public.campaigns;
create policy "Admins manage campaigns"
  on public.campaigns
  for all
  to authenticated
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

drop policy if exists "Admins manage campaign sends" on public.campaign_sends;
create policy "Admins manage campaign sends"
  on public.campaign_sends
  for all
  to authenticated
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

-- Public unsubscribe + Facebook webhook + cron use the service role.
