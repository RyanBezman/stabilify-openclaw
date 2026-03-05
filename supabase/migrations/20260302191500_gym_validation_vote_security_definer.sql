create or replace function public.validate_gym_session_validation_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.gym_session_validation_requests%rowtype;
  session_row public.gym_sessions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Missing user session.';
  end if;

  if new.friend_user_id <> auth.uid() then
    raise exception 'You can only vote as yourself.';
  end if;

  select *
  into request_row
  from public.gym_session_validation_requests
  where id = new.request_id
  for update;

  if request_row.id is null then
    raise exception 'Validation request not found.';
  end if;

  select *
  into session_row
  from public.gym_sessions
  where id = request_row.session_id
  for update;

  if session_row.id is null then
    raise exception 'Gym session not found for validation request.';
  end if;

  if request_row.status <> 'open' then
    raise exception 'This validation request is already closed.';
  end if;

  if request_row.expires_at <= now() then
    perform public.expire_gym_session_validation_requests(request_row.session_id);
    raise exception 'This validation request has expired.';
  end if;

  if session_row.status <> 'provisional' then
    update public.gym_session_validation_requests
    set status = 'expired',
        expired_at = now(),
        updated_at = now()
    where id = request_row.id
      and status = 'open';
    raise exception 'This session is no longer eligible for validation.';
  end if;

  if request_row.requester_user_id = new.friend_user_id then
    raise exception 'You cannot validate your own session.';
  end if;

  if not exists (
    select 1
    from public.close_friends as cf
    where cf.user_id = request_row.requester_user_id
      and cf.friend_user_id = new.friend_user_id
  ) then
    raise exception 'You are not an eligible close friend for this request.';
  end if;

  if exists (
    select 1
    from public.gym_session_validation_votes as vote
    where vote.request_id = new.request_id
      and vote.friend_user_id = new.friend_user_id
  ) then
    raise exception 'You have already voted on this request.';
  end if;

  return new;
end;
$$;

create or replace function public.apply_gym_session_validation_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.gym_session_validation_requests%rowtype;
  session_row public.gym_sessions%rowtype;
  friend_tier public.membership_tier := 'free'::public.membership_tier;
  requester_tier public.membership_tier := 'free'::public.membership_tier;
  upgraded_count integer := 0;
begin
  select *
  into request_row
  from public.gym_session_validation_requests
  where id = new.request_id
  for update;

  if request_row.id is null then
    return new;
  end if;

  select *
  into session_row
  from public.gym_sessions
  where id = request_row.session_id
  for update;

  if session_row.id is null then
    return new;
  end if;

  select coalesce(
    (
      select p.membership_tier
      from public.profiles as p
      where p.id = new.friend_user_id
    ),
    'free'::public.membership_tier
  )
  into friend_tier
  ;

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
    new.friend_user_id,
    'gym_session_validation_submitted',
    now(),
    'accountability:system',
    'workout'::public.coach_specialization,
    friend_tier,
    'mobile',
    'server',
    null,
    new.id::text,
    jsonb_build_object(
      'request_id', request_row.id,
      'session_id', request_row.session_id,
      'session_owner_user_id', request_row.requester_user_id,
      'decision', new.decision
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
    new.friend_user_id,
    'gym_session_validation_submitted',
    coalesce(session_row.session_date, current_date),
    'gym_session_validation_votes',
    new.id,
    jsonb_build_object(
      'request_id', request_row.id,
      'session_id', request_row.session_id,
      'session_owner_user_id', request_row.requester_user_id,
      'decision', new.decision
    ),
    'private'
  );

  if new.decision = 'accept' and request_row.status = 'open' then
    update public.gym_sessions
    set status = 'verified',
        status_reason = null,
        verified_at = coalesce(verified_at, now())
    where id = request_row.session_id
      and status = 'provisional';

    get diagnostics upgraded_count = row_count;

    update public.gym_session_validation_requests
    set status = 'accepted',
        accepted_at = coalesce(accepted_at, now()),
        updated_at = now()
    where id = request_row.id
      and status = 'open';

    if upgraded_count > 0 then
      select coalesce(
        (
          select p.membership_tier
          from public.profiles as p
          where p.id = request_row.requester_user_id
        ),
        'free'::public.membership_tier
      )
      into requester_tier
      ;

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
        request_row.requester_user_id,
        'gym_session_upgraded_verified',
        now(),
        'accountability:system',
        'workout'::public.coach_specialization,
        requester_tier,
        'mobile',
        'server',
        null,
        request_row.id::text,
        jsonb_build_object(
          'request_id', request_row.id,
          'session_id', request_row.session_id,
          'validator_user_id', new.friend_user_id
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
        request_row.requester_user_id,
        'gym_session_upgraded_verified',
        coalesce(session_row.session_date, current_date),
        'gym_sessions',
        request_row.session_id,
        jsonb_build_object(
          'request_id', request_row.id,
          'session_id', request_row.session_id,
          'validator_user_id', new.friend_user_id
        ),
        'private'
      );
    end if;
  elsif new.decision = 'decline' and request_row.status = 'open' then
    update public.gym_session_validation_requests
    set status = 'declined',
        declined_at = coalesce(declined_at, now()),
        updated_at = now()
    where id = request_row.id
      and status = 'open';
  end if;

  return new;
end;
$$;
