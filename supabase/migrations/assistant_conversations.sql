-- Assist AI conversation history.
-- Each signed-in user can read, insert, and delete only their own rows.
-- Run this in the Supabase SQL editor. It is not applied automatically.

create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  parts jsonb not null,
  created_at timestamptz not null default now(),
  constraint assistant_messages_parts_array check (jsonb_typeof(parts) = 'array'),
  constraint assistant_messages_parts_size check (octet_length(parts::text) <= 12000)
);

create index if not exists assistant_conversations_user_updated_idx
  on public.assistant_conversations (user_id, updated_at desc);

create index if not exists assistant_messages_conversation_created_idx
  on public.assistant_messages (conversation_id, created_at);

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;

drop policy if exists assistant_conversations_select on public.assistant_conversations;
drop policy if exists assistant_conversations_insert on public.assistant_conversations;
drop policy if exists assistant_conversations_delete on public.assistant_conversations;
drop policy if exists assistant_messages_select on public.assistant_messages;
drop policy if exists assistant_messages_insert on public.assistant_messages;
drop policy if exists assistant_messages_delete on public.assistant_messages;

create policy assistant_conversations_select
  on public.assistant_conversations
  for select
  to authenticated
  using (user_id = auth.uid());

create policy assistant_conversations_insert
  on public.assistant_conversations
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy assistant_conversations_delete
  on public.assistant_conversations
  for delete
  to authenticated
  using (user_id = auth.uid());

create policy assistant_messages_select
  on public.assistant_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.assistant_conversations
      where assistant_conversations.id = assistant_messages.conversation_id
        and assistant_conversations.user_id = auth.uid()
    )
  );

create policy assistant_messages_insert
  on public.assistant_messages
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.assistant_conversations
      where assistant_conversations.id = assistant_messages.conversation_id
        and assistant_conversations.user_id = auth.uid()
    )
  );

create policy assistant_messages_delete
  on public.assistant_messages
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.assistant_conversations
      where assistant_conversations.id = assistant_messages.conversation_id
        and assistant_conversations.user_id = auth.uid()
    )
  );

create or replace function public.touch_assistant_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.assistant_conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists assistant_messages_touch_conversation on public.assistant_messages;
create trigger assistant_messages_touch_conversation
  after insert on public.assistant_messages
  for each row
  execute function public.touch_assistant_conversation();

grant select, insert, delete on public.assistant_conversations to authenticated;
grant select, insert, delete on public.assistant_messages to authenticated;
