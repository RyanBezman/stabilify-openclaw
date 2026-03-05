do $$ begin
  create type public.activity_event_type as enum (
    'weigh_in_logged',
    'gym_session_verified',
    'streak_milestone',
    'support_request'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  event_type public.activity_event_type not null,
  event_date date not null,
  source_table text,
  source_id uuid,
  payload jsonb not null default '{}'::jsonb,
  visibility public.share_visibility not null default 'private',
  created_at timestamptz not null default now()
);

create index if not exists activity_events_actor_event_date_idx
on public.activity_events(actor_user_id, event_date desc, created_at desc);

create index if not exists activity_events_actor_created_at_idx
on public.activity_events(actor_user_id, created_at desc);

alter table public.activity_events enable row level security;

create policy "Activity events are readable by owner"
on public.activity_events
for select
using (auth.uid() = actor_user_id);

create policy "Activity events are insertable by owner"
on public.activity_events
for insert
with check (auth.uid() = actor_user_id);

create policy "Activity events are editable by owner"
on public.activity_events
for update
using (auth.uid() = actor_user_id)
with check (auth.uid() = actor_user_id);

create policy "Activity events are deletable by owner"
on public.activity_events
for delete
using (auth.uid() = actor_user_id);
