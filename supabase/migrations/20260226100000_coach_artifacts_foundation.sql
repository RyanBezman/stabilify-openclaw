create table if not exists public.coach_user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_user_profiles_profile_json_object_check
    check (jsonb_typeof(profile_json) = 'object')
);

drop trigger if exists coach_user_profiles_updated_at on public.coach_user_profiles;
create trigger coach_user_profiles_updated_at
before update on public.coach_user_profiles
for each row
execute function public.set_updated_at();

create index if not exists coach_user_profiles_profile_json_gin_idx
on public.coach_user_profiles
using gin (profile_json);

alter table public.coach_user_profiles enable row level security;

create policy "Coach user profiles are readable by owner"
on public.coach_user_profiles
for select
using (auth.uid() = user_id);

create policy "Coach user profiles are insertable by owner"
on public.coach_user_profiles
for insert
with check (auth.uid() = user_id);

create policy "Coach user profiles are editable by owner"
on public.coach_user_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Coach user profiles are deletable by owner"
on public.coach_user_profiles
for delete
using (auth.uid() = user_id);
