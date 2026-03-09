alter table public.profiles
  add column if not exists apple_health_steps_enabled boolean;

update public.profiles
set apple_health_steps_enabled = coalesce(apple_health_steps_enabled, false)
where apple_health_steps_enabled is null;

alter table public.profiles
  alter column apple_health_steps_enabled set default false,
  alter column apple_health_steps_enabled set not null;
