-- Expand credit application timeline stages + reference verification checklist.

-- ---------------------------------------------------------------------------
-- credit_applications.status: pending | verifying_references | action_required | approved | rejected
-- ---------------------------------------------------------------------------
alter table public.credit_applications drop constraint if exists credit_applications_status_check;

alter table public.credit_applications
  add constraint credit_applications_status_check
  check (
    status in (
      'pending',
      'verifying_references',
      'action_required',
      'approved',
      'rejected'
    )
  );

alter table public.credit_applications
  add column if not exists admin_notes text;

alter table public.credit_applications
  add column if not exists ref1_verify_status text not null default 'pending_check';

alter table public.credit_applications
  add column if not exists ref2_verify_status text not null default 'pending_check';

alter table public.credit_applications
  add column if not exists ref3_verify_status text not null default 'pending_check';

alter table public.credit_applications
  add column if not exists bank_verify_status text not null default 'pending_check';

do $$
begin
  alter table public.credit_applications
    drop constraint if exists credit_applications_ref1_verify_status_check;
  alter table public.credit_applications
    add constraint credit_applications_ref1_verify_status_check
    check (ref1_verify_status in ('pending_check', 'verified', 'unreachable'));

  alter table public.credit_applications
    drop constraint if exists credit_applications_ref2_verify_status_check;
  alter table public.credit_applications
    add constraint credit_applications_ref2_verify_status_check
    check (ref2_verify_status in ('pending_check', 'verified', 'unreachable'));

  alter table public.credit_applications
    drop constraint if exists credit_applications_ref3_verify_status_check;
  alter table public.credit_applications
    add constraint credit_applications_ref3_verify_status_check
    check (ref3_verify_status in ('pending_check', 'verified', 'unreachable'));

  alter table public.credit_applications
    drop constraint if exists credit_applications_bank_verify_status_check;
  alter table public.credit_applications
    add constraint credit_applications_bank_verify_status_check
    check (bank_verify_status in ('pending_check', 'verified', 'unreachable'));
exception
  when others then
    raise notice 'Reference verify constraints: %', SQLERRM;
end $$;

-- Backfill admin_notes from admin_comments when empty.
update public.credit_applications
set admin_notes = admin_comments
where admin_notes is null
  and admin_comments is not null
  and length(trim(admin_comments)) > 0;

-- ---------------------------------------------------------------------------
-- profiles.credit_application_status mirrors the same pipeline stages
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_credit_application_status_check;

do $$
begin
  alter table public.profiles
    add constraint profiles_credit_application_status_check
    check (
      credit_application_status is null
      or credit_application_status in (
        'pending',
        'verifying_references',
        'action_required',
        'approved',
        'rejected'
      )
    );
exception
  when duplicate_object then null;
  when check_violation then
    raise notice 'profiles status constraint skipped due to existing rows: %', SQLERRM;
end $$;

do $$
begin
  if to_regclass('public.company_profiles') is not null then
    alter table public.company_profiles
      drop constraint if exists company_profiles_credit_application_status_check;
    begin
      alter table public.company_profiles
        add constraint company_profiles_credit_application_status_check
        check (
          credit_application_status is null
          or credit_application_status in (
            'pending',
            'verifying_references',
            'action_required',
            'approved',
            'rejected'
          )
        );
    exception
      when others then
        raise notice 'company_profiles status constraint: %', SQLERRM;
    end;
  end if;
end $$;
