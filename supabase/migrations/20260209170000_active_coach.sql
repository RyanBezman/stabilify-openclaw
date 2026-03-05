do $$ begin
  create type public.coach_gender as enum ('woman', 'man');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.coach_personality as enum (
    'strict',
    'sweet',
    'relaxed',
    'bubbly',
    'hype',
    'analyst'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists active_coach_gender public.coach_gender,
  add column if not exists active_coach_personality public.coach_personality,
  add column if not exists active_coach_selected_at timestamptz;

alter table public.profiles
  add constraint profiles_active_coach_check
  check (
    (active_coach_gender is null and active_coach_personality is null)
    or (active_coach_gender is not null and active_coach_personality is not null)
  );

