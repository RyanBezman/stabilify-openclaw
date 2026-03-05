create index if not exists coach_weekly_checkins_user_spec_week_updated_idx
on public.coach_weekly_checkins(user_id, specialization, week_start desc, updated_at desc);
