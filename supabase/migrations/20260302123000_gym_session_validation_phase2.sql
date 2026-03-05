do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'activity_event_type'
  ) and not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = 'public'
      and t.typname = 'activity_event_type'
      and e.enumlabel = 'gym_session_validation_requested'
  ) then
    alter type public.activity_event_type add value 'gym_session_validation_requested';
  end if;

  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'activity_event_type'
  ) and not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = 'public'
      and t.typname = 'activity_event_type'
      and e.enumlabel = 'gym_session_validation_submitted'
  ) then
    alter type public.activity_event_type add value 'gym_session_validation_submitted';
  end if;

  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'activity_event_type'
  ) and not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = 'public'
      and t.typname = 'activity_event_type'
      and e.enumlabel = 'gym_session_upgraded_verified'
  ) then
    alter type public.activity_event_type add value 'gym_session_upgraded_verified';
  end if;

  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'activity_event_type'
  ) and not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = 'public'
      and t.typname = 'activity_event_type'
      and e.enumlabel = 'gym_session_validation_expired'
  ) then
    alter type public.activity_event_type add value 'gym_session_validation_expired';
  end if;
end $$;

do $$ begin
  create type public.gym_session_validation_request_status as enum (
    'open',
    'accepted',
    'declined',
    'expired'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.gym_session_validation_decision as enum (
    'accept',
    'decline'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.gym_session_validation_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.gym_sessions(id) on delete cascade,
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  status public.gym_session_validation_request_status not null default 'open',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  declined_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists gym_session_validation_requests_open_session_key
on public.gym_session_validation_requests(session_id)
where status = 'open';

create index if not exists gym_session_validation_requests_requester_status_idx
on public.gym_session_validation_requests(requester_user_id, status, created_at desc);

create index if not exists gym_session_validation_requests_status_expires_idx
on public.gym_session_validation_requests(status, expires_at);

create table if not exists public.gym_session_validation_votes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.gym_session_validation_requests(id) on delete cascade,
  friend_user_id uuid not null references auth.users(id) on delete cascade,
  decision public.gym_session_validation_decision not null,
  created_at timestamptz not null default now()
);

create unique index if not exists gym_session_validation_votes_request_friend_key
on public.gym_session_validation_votes(request_id, friend_user_id);

create index if not exists gym_session_validation_votes_request_idx
on public.gym_session_validation_votes(request_id, created_at asc);

create index if not exists gym_session_validation_votes_friend_idx
on public.gym_session_validation_votes(friend_user_id, created_at desc);

drop trigger if exists gym_session_validation_requests_updated_at on public.gym_session_validation_requests;
create trigger gym_session_validation_requests_updated_at
before update on public.gym_session_validation_requests
for each row
execute function public.set_updated_at();

alter table public.gym_session_validation_requests enable row level security;
alter table public.gym_session_validation_votes enable row level security;

drop policy if exists "Gym validation requests are readable by requester or close friends" on public.gym_session_validation_requests;
create policy "Gym validation requests are readable by requester or close friends"
on public.gym_session_validation_requests
for select
to authenticated
using (
  auth.uid() = requester_user_id
  or exists (
    select 1
    from public.close_friends as cf
    where cf.user_id = gym_session_validation_requests.requester_user_id
      and cf.friend_user_id = auth.uid()
  )
);

drop policy if exists "Gym validation requests are insertable by requester" on public.gym_session_validation_requests;
create policy "Gym validation requests are insertable by requester"
on public.gym_session_validation_requests
for insert
to authenticated
with check (auth.uid() = requester_user_id);

drop policy if exists "Gym validation votes are readable by participants" on public.gym_session_validation_votes;
create policy "Gym validation votes are readable by participants"
on public.gym_session_validation_votes
for select
to authenticated
using (
  auth.uid() = friend_user_id
  or exists (
    select 1
    from public.gym_session_validation_requests as req
    where req.id = gym_session_validation_votes.request_id
      and req.requester_user_id = auth.uid()
  )
);

drop policy if exists "Gym validation votes are insertable by close friend" on public.gym_session_validation_votes;
create policy "Gym validation votes are insertable by close friend"
on public.gym_session_validation_votes
for insert
to authenticated
with check (
  auth.uid() = friend_user_id
  and exists (
    select 1
    from public.gym_session_validation_requests as req
    join public.gym_sessions as gs on gs.id = req.session_id
    where req.id = gym_session_validation_votes.request_id
      and req.status = 'open'
      and req.expires_at > now()
      and gs.status = 'provisional'
      and req.requester_user_id <> auth.uid()
      and exists (
        select 1
        from public.close_friends as cf
        where cf.user_id = req.requester_user_id
          and cf.friend_user_id = auth.uid()
      )
  )
);

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
    update public.gym_session_validation_requests as req
    set status = 'expired',
        expired_at = coalesce(req.expired_at, now()),
        updated_at = now()
    where req.status = 'open'
      and req.expires_at <= now()
      and (p_session_id is null or req.session_id = p_session_id)
    returning req.id, req.session_id, req.requester_user_id, req.expires_at
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
        'expires_at', expired_row.expires_at
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
        'expires_at', expired_row.expires_at
      ),
      'private'
    );

    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

create or replace function public.validate_gym_session_validation_request()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  session_row public.gym_sessions%rowtype;
  close_friend_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Missing user session.';
  end if;

  if new.requester_user_id <> auth.uid() then
    raise exception 'You can only create validation requests as yourself.';
  end if;

  perform public.expire_gym_session_validation_requests(new.session_id);

  select *
  into session_row
  from public.gym_sessions
  where id = new.session_id
  for update;

  if session_row.id is null then
    raise exception 'Gym session not found.';
  end if;

  if session_row.user_id <> new.requester_user_id then
    raise exception 'You can only request validation for your own session.';
  end if;

  if session_row.status <> 'provisional' then
    raise exception 'Only provisional sessions can be validated by close friends.';
  end if;

  select count(*)
  into close_friend_count
  from public.close_friends
  where user_id = new.requester_user_id;

  if close_friend_count <= 0 then
    raise exception 'Add at least one close friend before requesting validation.';
  end if;

  if exists (
    select 1
    from public.gym_session_validation_requests as req
    where req.session_id = new.session_id
      and req.status = 'open'
  ) then
    raise exception 'A validation request is already open for this session.';
  end if;

  new.status := 'open';
  if new.expires_at is null then
    new.expires_at := now() + interval '48 hours';
  elsif new.expires_at <= now() then
    raise exception 'Validation request expiry must be in the future.';
  end if;

  return new;
end;
$$;

create or replace function public.log_gym_session_validation_request_event()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  session_row public.gym_sessions%rowtype;
  requester_tier public.membership_tier := 'free'::public.membership_tier;
begin
  select *
  into session_row
  from public.gym_sessions
  where id = new.session_id;

  select coalesce(
    (
      select p.membership_tier
      from public.profiles as p
      where p.id = new.requester_user_id
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
    new.requester_user_id,
    'gym_session_validation_requested',
    now(),
    'accountability:system',
    'workout'::public.coach_specialization,
    requester_tier,
    'mobile',
    'server',
    null,
    new.id::text,
    jsonb_build_object(
      'request_id', new.id,
      'session_id', new.session_id,
      'expires_at', new.expires_at
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
    new.requester_user_id,
    'gym_session_validation_requested',
    coalesce(session_row.session_date, current_date),
    'gym_session_validation_requests',
    new.id,
    jsonb_build_object(
      'request_id', new.id,
      'session_id', new.session_id,
      'expires_at', new.expires_at
    ),
    'private'
  );

  return new;
end;
$$;

create or replace function public.validate_gym_session_validation_vote()
returns trigger
language plpgsql
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

drop trigger if exists gym_session_validation_requests_validate_before_insert on public.gym_session_validation_requests;
create trigger gym_session_validation_requests_validate_before_insert
before insert on public.gym_session_validation_requests
for each row
execute function public.validate_gym_session_validation_request();

drop trigger if exists gym_session_validation_requests_log_after_insert on public.gym_session_validation_requests;
create trigger gym_session_validation_requests_log_after_insert
after insert on public.gym_session_validation_requests
for each row
execute function public.log_gym_session_validation_request_event();

drop trigger if exists gym_session_validation_votes_validate_before_insert on public.gym_session_validation_votes;
create trigger gym_session_validation_votes_validate_before_insert
before insert on public.gym_session_validation_votes
for each row
execute function public.validate_gym_session_validation_vote();

drop trigger if exists gym_session_validation_votes_apply_after_insert on public.gym_session_validation_votes;
create trigger gym_session_validation_votes_apply_after_insert
after insert on public.gym_session_validation_votes
for each row
execute function public.apply_gym_session_validation_vote();

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
      'gym_session_validation_expired'
    )
  );

revoke all on function public.expire_gym_session_validation_requests(uuid) from public;
grant execute on function public.expire_gym_session_validation_requests(uuid) to authenticated;
