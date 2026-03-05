do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = 'public'
      and t.typname = 'gym_session_status'
      and e.enumlabel = 'pending'
  ) and not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = 'public'
      and t.typname = 'gym_session_status'
      and e.enumlabel = 'partial'
  ) then
    alter type public.gym_session_status rename value 'pending' to 'partial';
  end if;

  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = 'public'
      and t.typname = 'gym_session_status'
      and e.enumlabel = 'rejected'
  ) and not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = 'public'
      and t.typname = 'gym_session_status'
      and e.enumlabel = 'provisional'
  ) then
    alter type public.gym_session_status rename value 'rejected' to 'provisional';
  end if;
end $$;

alter table if exists public.gym_sessions
  alter column status set default 'partial';
