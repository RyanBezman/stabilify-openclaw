alter table public.coach_weekly_checkins
drop constraint if exists coach_weekly_checkins_blockers_not_blank;

alter table public.coach_weekly_checkins
add constraint coach_weekly_checkins_blockers_length_check
check (length(trim(blockers)) <= 500);
