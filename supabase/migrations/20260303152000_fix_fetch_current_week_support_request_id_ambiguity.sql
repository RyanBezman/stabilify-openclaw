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

  select coalesce(nullif(trim(p.timezone), ''), 'UTC')
  into user_timezone
  from public.profiles as p
  where p.id = current_user_id;

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
