alter table public.goals
  add column if not exists ended_at timestamptz;

drop index if exists public.goals_user_id_key;

create unique index if not exists goals_user_active_key
on public.goals(user_id)
where is_active;

alter table public.goals
  add constraint goals_active_ended_check
  check (
    (is_active and ended_at is null)
    or (not is_active and ended_at is not null)
  );
