alter table if exists public.support_requests
  add column if not exists nudge_deferred_until_local_date date;

create or replace function public.fetch_current_week_support_request()
returns table (
  id uuid,
  user_id uuid,
  week_start date,
  week_end date,
  trigger_reason public.support_trigger_reason,
  status public.support_request_status,
  outcome_post_id uuid,
  nudge_opened_at timestamptz,
  nudge_opened_surface public.support_nudge_surface,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  user_timezone text := 'UTC';
  today_local date;
  week_start_local date;
begin
  if current_user_id is null then
    raise exception 'Missing user session.';
  end if;

  select coalesce(nullif(trim(timezone), ''), 'UTC')
  into user_timezone
  from public.profiles
  where id = current_user_id;

  today_local := public.support_local_date(now(), user_timezone);
  week_start_local := public.support_week_start(today_local);

  return query
  select
    sr.id,
    sr.user_id,
    sr.week_start,
    sr.week_end,
    sr.trigger_reason,
    sr.status,
    sr.outcome_post_id,
    sr.nudge_opened_at,
    sr.nudge_opened_surface,
    sr.created_at,
    sr.updated_at
  from public.support_requests as sr
  where sr.user_id = current_user_id
    and sr.week_start = week_start_local
    and (
      sr.status <> 'suppressed_no_consent'
      or sr.nudge_deferred_until_local_date is null
      or sr.nudge_deferred_until_local_date <= today_local
    )
  order by sr.created_at desc
  limit 1;
end;
$$;

create or replace function public.allow_auto_support_with_consent()
returns table (
  auto_support_enabled boolean,
  auto_support_consent_at timestamptz,
  changed_enabled boolean,
  changed_consent boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_enabled boolean := true;
  current_consent_at timestamptz := null;
  member_tier public.membership_tier := 'free';
  next_consent_at timestamptz := now();
begin
  if current_user_id is null then
    raise exception 'Missing user session.';
  end if;

  select
    coalesce(p.auto_support_enabled, true),
    p.auto_support_consent_at,
    coalesce(p.membership_tier, 'free'::public.membership_tier)
  into current_enabled, current_consent_at, member_tier
  from public.profiles as p
  where p.id = current_user_id
  for update;

  if not found then
    raise exception 'Profile not found.';
  end if;

  next_consent_at := coalesce(current_consent_at, now());

  update public.profiles as p
  set
    auto_support_enabled = true,
    auto_support_consent_at = next_consent_at,
    updated_at = now()
  where p.id = current_user_id;

  if current_enabled is distinct from true then
    perform public.insert_support_automation_analytics_event(
      p_user_id := current_user_id,
      p_user_tier := member_tier,
      p_event_name := 'support_auto_post_setting_changed',
      p_trigger_reason := null,
      p_metadata := jsonb_build_object(
        'auto_support_enabled', true
      )
    );
  end if;

  return query
  select
    true,
    next_consent_at,
    (current_enabled is distinct from true),
    (current_consent_at is null);
end;
$$;

create or replace function public.defer_support_nudge(
  p_request_id uuid,
  p_surface public.support_nudge_surface
)
returns table (
  request_id uuid,
  nudge_deferred_until_local_date date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  request_row public.support_requests%rowtype;
  user_timezone text := 'UTC';
  local_today date;
  deferred_until date;
begin
  if current_user_id is null then
    raise exception 'Missing user session.';
  end if;

  select *
  into request_row
  from public.support_requests as sr
  where sr.id = p_request_id
    and sr.user_id = current_user_id
  for update;

  if request_row.id is null then
    raise exception 'Support request not found.';
  end if;

  if request_row.status <> 'suppressed_no_consent' then
    raise exception 'Only suppressed support requests can be deferred.';
  end if;

  select coalesce(nullif(trim(p.timezone), ''), 'UTC')
  into user_timezone
  from public.profiles as p
  where p.id = current_user_id;

  local_today := public.support_local_date(now(), user_timezone);
  deferred_until := local_today + 1;

  update public.support_requests as sr
  set
    nudge_deferred_until_local_date = deferred_until,
    updated_at = now()
  where sr.id = request_row.id;

  return query
  select
    request_row.id,
    deferred_until;
end;
$$;

revoke all on function public.allow_auto_support_with_consent() from public;
revoke all on function public.allow_auto_support_with_consent() from authenticated;
grant execute on function public.allow_auto_support_with_consent() to authenticated;

revoke all on function public.defer_support_nudge(uuid, public.support_nudge_surface) from public;
revoke all on function public.defer_support_nudge(uuid, public.support_nudge_surface) from authenticated;
grant execute on function public.defer_support_nudge(uuid, public.support_nudge_surface) to authenticated;
