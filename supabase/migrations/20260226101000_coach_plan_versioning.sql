do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'superseded'
      and enumtypid = 'public.coach_plan_status'::regtype
  ) then
    alter type public.coach_plan_status add value 'superseded';
  end if;
end $$;

alter table public.coach_plans
  add column if not exists version integer,
  add column if not exists supersedes_plan_id uuid references public.coach_plans(id) on delete set null;

with ranked as (
  select
    id,
    row_number() over (
      partition by thread_id, type
      order by created_at asc, id asc
    )::integer as next_version
  from public.coach_plans
)
update public.coach_plans p
set version = r.next_version
from ranked r
where p.id = r.id
  and (p.version is null or p.version <= 0);

alter table public.coach_plans
  alter column version set default 1;

update public.coach_plans
set version = 1
where version is null or version <= 0;

alter table public.coach_plans
  alter column version set not null;

alter table public.coach_plans
  drop constraint if exists coach_plans_version_positive_check;

alter table public.coach_plans
  add constraint coach_plans_version_positive_check
  check (version > 0);

create unique index if not exists coach_plans_thread_type_version_key
on public.coach_plans(thread_id, type, version);

create index if not exists coach_plans_user_type_version_idx
on public.coach_plans(user_id, type, version desc, updated_at desc);
