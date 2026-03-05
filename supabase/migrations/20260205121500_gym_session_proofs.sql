alter table public.gym_sessions
  add column if not exists proof_path text,
  add column if not exists proof_captured_at timestamptz,
  add column if not exists proof_lat numeric(9,6),
  add column if not exists proof_lng numeric(9,6);
