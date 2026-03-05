create or replace function public.expire_gym_session_validation_requests(
  p_session_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer := 0;
  expired_row record;
  requester_tier public.membership_tier;
  session_date date;
begin
  for expired_row in
    with candidate_requests as (
      select
        req.id,
        req.session_id,
        req.requester_user_id,
        req.expires_at,
        case
          when req.expires_at <= now() then 'timeout'
          when gs.id is null then 'session_missing'
          else 'session_resolved'
        end as expire_reason
      from public.gym_session_validation_requests as req
      left join public.gym_sessions as gs on gs.id = req.session_id
      where req.status = 'open'
        and (p_session_id is null or req.session_id = p_session_id)
        and (
          req.expires_at <= now()
          or gs.id is null
          or gs.status <> 'provisional'
        )
    )
    update public.gym_session_validation_requests as req
    set status = 'expired',
        expired_at = coalesce(req.expired_at, now()),
        updated_at = now()
    from candidate_requests as candidate
    where req.id = candidate.id
    returning
      req.id,
      req.session_id,
      req.requester_user_id,
      req.expires_at,
      candidate.expire_reason
  loop
    select coalesce(
      (
        select p.membership_tier
        from public.profiles as p
        where p.id = expired_row.requester_user_id
      ),
      'free'::public.membership_tier
    )
    into requester_tier;

    select gs.session_date
    into session_date
    from public.gym_sessions as gs
    where gs.id = expired_row.session_id;

    insert into public.analytics_events (
      user_id,
      event_name,
      occurred_at,
      coach_persona,
      specialization,
      user_tier,
      source,
      platform,
      app_version,
      session_id,
      metadata
    )
    values (
      expired_row.requester_user_id,
      'gym_session_validation_expired',
      now(),
      'accountability:system',
      'workout'::public.coach_specialization,
      requester_tier,
      'mobile',
      'server',
      null,
      expired_row.id::text,
      jsonb_build_object(
        'request_id', expired_row.id,
        'session_id', expired_row.session_id,
        'expires_at', expired_row.expires_at,
        'expire_reason', expired_row.expire_reason
      )
    );

    insert into public.activity_events (
      actor_user_id,
      event_type,
      event_date,
      source_table,
      source_id,
      payload,
      visibility
    )
    values (
      expired_row.requester_user_id,
      'gym_session_validation_expired',
      coalesce(session_date, current_date),
      'gym_session_validation_requests',
      expired_row.id,
      jsonb_build_object(
        'request_id', expired_row.id,
        'session_id', expired_row.session_id,
        'expires_at', expired_row.expires_at,
        'expire_reason', expired_row.expire_reason
      ),
      'private'
    );

    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;
