do $$ begin
  create type public.gym_session_status_reason as enum (
    'outside_radius',
    'missing_photo',
    'missing_location',
    'missing_gym_setup',
    'permission_denied',
    'manual_override'
  );
exception
  when duplicate_object then null;
end $$;

alter table if exists public.gym_sessions
  add column if not exists status_reason public.gym_session_status_reason;

update public.gym_sessions
set status_reason = null
where status = 'verified';

update public.gym_sessions
set status_reason = 'outside_radius'
where status = 'provisional'
  and status_reason is null;

update public.gym_sessions as gs
set status_reason = case
  when gs.proof_path is null then 'missing_photo'::public.gym_session_status_reason
  when gs.proof_lat is null or gs.proof_lng is null then 'missing_location'::public.gym_session_status_reason
  when r.gym_lat is null or r.gym_lng is null or coalesce(r.gym_radius_m, 0) <= 0
    then 'missing_gym_setup'::public.gym_session_status_reason
  else 'missing_location'::public.gym_session_status_reason
end
from public.routines as r
where gs.user_id = r.user_id
  and gs.status = 'partial'
  and gs.status_reason is null;

update public.gym_sessions
set status_reason = case
  when proof_path is null then 'missing_photo'::public.gym_session_status_reason
  when proof_lat is null or proof_lng is null then 'missing_location'::public.gym_session_status_reason
  else 'missing_gym_setup'::public.gym_session_status_reason
end
where status = 'partial'
  and status_reason is null;

alter table if exists public.gym_sessions
  drop constraint if exists gym_sessions_status_reason_required;

alter table if exists public.gym_sessions
  add constraint gym_sessions_status_reason_required
  check (
    (status = 'verified' and (status_reason is null or status_reason = 'manual_override'))
    or (status in ('partial', 'provisional') and status_reason is not null)
  );
