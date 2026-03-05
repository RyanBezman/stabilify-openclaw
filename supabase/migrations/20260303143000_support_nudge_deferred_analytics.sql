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
  member_tier public.membership_tier := 'free';
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

  select
    coalesce(nullif(trim(p.timezone), ''), 'UTC'),
    coalesce(p.membership_tier, 'free'::public.membership_tier)
  into user_timezone, member_tier
  from public.profiles as p
  where p.id = current_user_id;

  local_today := public.support_local_date(now(), user_timezone);
  deferred_until := local_today + 1;

  update public.support_requests as sr
  set
    nudge_deferred_until_local_date = deferred_until,
    updated_at = now()
  where sr.id = request_row.id;

  perform public.insert_support_automation_analytics_event(
    p_user_id := current_user_id,
    p_user_tier := member_tier,
    p_event_name := 'support_nudge_deferred',
    p_trigger_reason := request_row.trigger_reason,
    p_metadata := jsonb_build_object(
      'surface', p_surface,
      'support_request_id', request_row.id,
      'status', request_row.status,
      'deferred_until_local_date', deferred_until
    )
  );

  return query
  select
    request_row.id,
    deferred_until;
end;
$$;

alter table if exists public.analytics_events
  drop constraint if exists analytics_events_event_name_check;

alter table if exists public.analytics_events
  add constraint analytics_events_event_name_check
  check (
    event_name in (
      'checkin_opened',
      'checkin_submitted',
      'plan_review_opened',
      'plan_decision_made',
      'next_checkin_submitted',
      'gym_session_validation_requested',
      'gym_session_validation_submitted',
      'gym_session_upgraded_verified',
      'gym_session_validation_expired',
      'private_nudge_sent',
      'private_nudge_opened',
      'support_auto_post_published',
      'support_auto_post_suppressed_no_consent',
      'support_auto_post_setting_changed',
      'support_nudge_deferred'
    )
  );
