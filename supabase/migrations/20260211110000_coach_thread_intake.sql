alter table if exists public.coach_threads
  add column if not exists intake_json jsonb,
  add column if not exists intake_updated_at timestamptz;
