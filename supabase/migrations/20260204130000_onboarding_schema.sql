-- Core enums
do $$ begin
  create type public.weight_unit as enum ('lb', 'kg');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.goal_type as enum ('maintain', 'lose', 'gain');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.weigh_in_cadence as enum ('daily', 'three_per_week', 'custom');
exception
  when duplicate_object then null;
end $$;

create extension if not exists "pgcrypto";

-- Timestamp helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  preferred_unit public.weight_unit not null default 'lb',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "Profiles are readable by owner"
on public.profiles
for select
using (auth.uid() = id);

create policy "Profiles are insertable by owner"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Profiles are editable by owner"
on public.profiles
for update
using (auth.uid() = id);

-- Goals
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_type public.goal_type not null,
  target_min numeric(6,2),
  target_max numeric(6,2),
  target_weight numeric(6,2),
  start_weight numeric(6,2) not null,
  start_date date not null default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists goals_user_id_key
on public.goals(user_id);

alter table public.goals
  add constraint goals_target_mode_check
  check (
    (goal_type = 'maintain' and target_min is not null and target_max is not null and target_weight is null)
    or (goal_type in ('lose', 'gain') and target_weight is not null and target_min is null and target_max is null)
  );

alter table public.goals
  add constraint goals_range_check
  check (
    target_min is null or target_max is null or target_min <= target_max
  );

alter table public.goals
  add constraint goals_positive_weights_check
  check (
    start_weight > 0
    and (target_min is null or target_min > 0)
    and (target_max is null or target_max > 0)
    and (target_weight is null or target_weight > 0)
  );

create trigger goals_updated_at
before update on public.goals
for each row
execute function public.set_updated_at();

alter table public.goals enable row level security;

create policy "Goals are readable by owner"
on public.goals
for select
using (auth.uid() = user_id);

create policy "Goals are insertable by owner"
on public.goals
for insert
with check (auth.uid() = user_id);

create policy "Goals are editable by owner"
on public.goals
for update
using (auth.uid() = user_id);

-- Routines
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weigh_in_cadence public.weigh_in_cadence not null,
  custom_cadence integer,
  reminder_time text,
  gym_proof_enabled boolean not null default false,
  gym_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists routines_user_id_key
on public.routines(user_id);

alter table public.routines
  add constraint routines_custom_cadence_check
  check (
    (weigh_in_cadence = 'custom' and custom_cadence is not null and custom_cadence > 0)
    or (weigh_in_cadence <> 'custom' and custom_cadence is null)
  );

create trigger routines_updated_at
before update on public.routines
for each row
execute function public.set_updated_at();

alter table public.routines enable row level security;

create policy "Routines are readable by owner"
on public.routines
for select
using (auth.uid() = user_id);

create policy "Routines are insertable by owner"
on public.routines
for insert
with check (auth.uid() = user_id);

create policy "Routines are editable by owner"
on public.routines
for update
using (auth.uid() = user_id);
