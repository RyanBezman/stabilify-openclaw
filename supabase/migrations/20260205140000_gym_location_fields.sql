alter table public.routines
  add column if not exists gym_place_name text,
  add column if not exists gym_place_address text,
  add column if not exists gym_lat numeric(9,6),
  add column if not exists gym_lng numeric(9,6),
  add column if not exists gym_radius_m integer not null default 150;
