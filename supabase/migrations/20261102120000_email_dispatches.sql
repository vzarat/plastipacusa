-- Optional audit log for outbound Resend sends (admin usage fallback).
-- Run in the Supabase SQL editor. The app still prefers Resend metrics when available.

create table if not exists public.email_dispatches (
  id uuid primary key default gen_random_uuid(),
  resend_id text,
  subject text not null,
  recipient_count integer not null default 1 check (recipient_count > 0),
  status text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  created_at timestamptz not null default now()
);

create index if not exists email_dispatches_created_at_idx
  on public.email_dispatches (created_at desc);

create index if not exists email_dispatches_status_created_at_idx
  on public.email_dispatches (status, created_at desc);

alter table public.email_dispatches enable row level security;

-- Service role inserts from the server; no public policies needed.
