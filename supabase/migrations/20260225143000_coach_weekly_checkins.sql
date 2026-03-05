create table if not exists public.coach_weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  specialization public.coach_specialization not null default 'nutrition',
  thread_id uuid not null references public.coach_threads(id) on delete cascade,
  coach_profile_id text not null references public.coach_profiles(id) on delete restrict,
  week_start date not null,
  week_end date not null,
  energy smallint not null,
  adherence_percent smallint not null,
  blockers text not null,
  weight_snapshot jsonb not null default '{}'::jsonb,
  coach_summary text,
  summary_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_weekly_checkins_week_window_check check (week_end = week_start + 6),
  constraint coach_weekly_checkins_energy_check check (energy between 1 and 5),
  constraint coach_weekly_checkins_adherence_check check (adherence_percent between 0 and 100),
  constraint coach_weekly_checkins_blockers_not_blank check (length(trim(blockers)) > 0),
  constraint coach_weekly_checkins_summary_not_blank check (
    coach_summary is null or length(trim(coach_summary)) > 0
  )
);

create unique index if not exists coach_weekly_checkins_user_specialization_week_start_key
on public.coach_weekly_checkins(user_id, specialization, week_start);

create index if not exists coach_weekly_checkins_user_week_start_idx
on public.coach_weekly_checkins(user_id, week_start desc, updated_at desc);

drop trigger if exists coach_weekly_checkins_updated_at on public.coach_weekly_checkins;
create trigger coach_weekly_checkins_updated_at
before update on public.coach_weekly_checkins
for each row
execute function public.set_updated_at();

alter table public.coach_weekly_checkins enable row level security;

create policy "Coach weekly check-ins are readable by owner"
on public.coach_weekly_checkins
for select
using (auth.uid() = user_id);

create policy "Coach weekly check-ins are insertable by owner"
on public.coach_weekly_checkins
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.coach_threads t
    where t.id = coach_weekly_checkins.thread_id
      and t.user_id = auth.uid()
      and t.specialization = coach_weekly_checkins.specialization
      and t.coach_profile_id = coach_weekly_checkins.coach_profile_id
  )
);

create policy "Coach weekly check-ins are editable by owner"
on public.coach_weekly_checkins
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.coach_threads t
    where t.id = coach_weekly_checkins.thread_id
      and t.user_id = auth.uid()
      and t.specialization = coach_weekly_checkins.specialization
      and t.coach_profile_id = coach_weekly_checkins.coach_profile_id
  )
);

create policy "Coach weekly check-ins are deletable by owner"
on public.coach_weekly_checkins
for delete
using (auth.uid() = user_id);
