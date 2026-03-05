alter table public.coach_weekly_checkins
  add column if not exists checkin_json jsonb not null default '{}'::jsonb,
  add column if not exists adherence_score smallint not null default 0,
  add column if not exists workout_plan_version integer,
  add column if not exists nutrition_plan_version integer,
  add column if not exists adjustment_json jsonb;

alter table public.coach_weekly_checkins
  drop constraint if exists coach_weekly_checkins_adherence_score_check;

alter table public.coach_weekly_checkins
  add constraint coach_weekly_checkins_adherence_score_check
  check (adherence_score between 0 and 100);

alter table public.coach_weekly_checkins
  drop constraint if exists coach_weekly_checkins_checkin_json_object_check;

alter table public.coach_weekly_checkins
  add constraint coach_weekly_checkins_checkin_json_object_check
  check (jsonb_typeof(checkin_json) = 'object');

alter table public.coach_weekly_checkins
  drop constraint if exists coach_weekly_checkins_adjustment_json_object_check;

alter table public.coach_weekly_checkins
  add constraint coach_weekly_checkins_adjustment_json_object_check
  check (
    adjustment_json is null
    or jsonb_typeof(adjustment_json) = 'object'
  );

create index if not exists coach_weekly_checkins_user_week_start_desc_idx
on public.coach_weekly_checkins(user_id, week_start desc);

create index if not exists coach_weekly_checkins_user_spec_week_start_desc_idx
on public.coach_weekly_checkins(user_id, specialization, week_start desc);
