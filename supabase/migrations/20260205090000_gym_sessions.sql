do $$ begin
  create type public.gym_session_status as enum ('verified', 'partial', 'provisional');
exception
  when duplicate_object then null;
end $$;

alter table public.routines
  add column if not exists gym_sessions_target integer not null default 4;

alter table public.routines
  add constraint routines_gym_sessions_target_check
  check (gym_sessions_target between 1 and 7);

create table if not exists public.gym_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null,
  status public.gym_session_status not null default 'partial',
  recorded_at timestamptz not null default now(),
  verified_at timestamptz,
  timezone text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists gym_sessions_user_date_key
on public.gym_sessions(user_id, session_date);

create index if not exists gym_sessions_user_date_idx
on public.gym_sessions(user_id, session_date desc);

alter table public.gym_sessions enable row level security;

create policy "Gym sessions are readable by owner"
on public.gym_sessions
for select
using (auth.uid() = user_id);

create policy "Gym sessions are insertable by owner"
on public.gym_sessions
for insert
with check (auth.uid() = user_id);

create policy "Gym sessions are editable by owner"
on public.gym_sessions
for update
using (auth.uid() = user_id);
