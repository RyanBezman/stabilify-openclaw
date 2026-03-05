alter table public.gym_sessions
  add column if not exists distance_meters numeric(10,2);
