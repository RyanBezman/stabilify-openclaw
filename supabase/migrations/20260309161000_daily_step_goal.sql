alter table public.profiles
  add column if not exists daily_step_goal integer;

update public.profiles
set daily_step_goal = 10000
where daily_step_goal is null;

alter table public.profiles
  alter column daily_step_goal set default 10000,
  alter column daily_step_goal set not null;

alter table public.profiles
  drop constraint if exists profiles_daily_step_goal_range;

alter table public.profiles
  add constraint profiles_daily_step_goal_range
  check (daily_step_goal between 1000 and 50000);
