do $$ begin
  create type public.support_trigger_reason as enum (
    'miss_trajectory_3_days',
    'missed_weekly_target',
    'two_consecutive_missed_weeks'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.support_request_status as enum (
    'published',
    'suppressed_no_consent',
    'disabled'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.support_nudge_surface as enum (
    'home'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.push_delivery_status as enum (
    'pending',
    'sent',
    'failed'
  );
exception
  when duplicate_object then null;
end $$;

alter table if exists public.profiles
  add column if not exists auto_support_enabled boolean,
  add column if not exists auto_support_consent_at timestamptz;

update public.profiles
set auto_support_enabled = coalesce(auto_support_enabled, true)
where auto_support_enabled is null;

alter table if exists public.profiles
  alter column auto_support_enabled set default true,
  alter column auto_support_enabled set not null;

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  trigger_reason public.support_trigger_reason not null,
  status public.support_request_status not null,
  outcome_post_id uuid references public.posts(id) on delete set null,
  nudge_opened_at timestamptz,
  nudge_opened_surface public.support_nudge_surface,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_requests_week_window_check
    check (week_end = week_start + 6),
  constraint support_requests_nudge_surface_required_check
    check (
      (nudge_opened_at is null and nudge_opened_surface is null)
      or (nudge_opened_at is not null and nudge_opened_surface is not null)
    )
);

create unique index if not exists support_requests_user_week_start_key
on public.support_requests(user_id, week_start);

create index if not exists support_requests_user_created_idx
on public.support_requests(user_id, created_at desc);

create table if not exists public.push_notification_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  platform text not null,
  app_version text,
  is_active boolean not null default true,
  last_registered_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_notification_devices_token_not_blank
    check (length(trim(expo_push_token)) > 0),
  constraint push_notification_devices_platform_not_blank
    check (length(trim(platform)) > 0)
);

create unique index if not exists push_notification_devices_user_token_key
on public.push_notification_devices(user_id, expo_push_token);

create index if not exists push_notification_devices_user_active_idx
on public.push_notification_devices(user_id, is_active, last_registered_at desc);

create table if not exists public.support_nudge_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.support_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid references public.push_notification_devices(id) on delete set null,
  expo_push_token text not null,
  message_title text not null,
  message_body text not null,
  attempt_count integer not null default 0,
  status public.push_delivery_status not null default 'pending',
  next_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_nudge_push_deliveries_attempt_count_check
    check (attempt_count >= 0),
  constraint support_nudge_push_deliveries_token_not_blank
    check (length(trim(expo_push_token)) > 0)
);

create index if not exists support_nudge_push_deliveries_pending_idx
on public.support_nudge_push_deliveries(status, next_attempt_at asc)
where status = 'pending';

create index if not exists support_nudge_push_deliveries_user_created_idx
on public.support_nudge_push_deliveries(user_id, created_at desc);

create table if not exists public.support_automation_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_evaluated_local_date date,
  last_evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists support_requests_updated_at on public.support_requests;
create trigger support_requests_updated_at
before update on public.support_requests
for each row
execute function public.set_updated_at();

drop trigger if exists push_notification_devices_updated_at on public.push_notification_devices;
create trigger push_notification_devices_updated_at
before update on public.push_notification_devices
for each row
execute function public.set_updated_at();

drop trigger if exists support_nudge_push_deliveries_updated_at on public.support_nudge_push_deliveries;
create trigger support_nudge_push_deliveries_updated_at
before update on public.support_nudge_push_deliveries
for each row
execute function public.set_updated_at();

drop trigger if exists support_automation_state_updated_at on public.support_automation_state;
create trigger support_automation_state_updated_at
before update on public.support_automation_state
for each row
execute function public.set_updated_at();

alter table public.support_requests enable row level security;
alter table public.push_notification_devices enable row level security;
alter table public.support_nudge_push_deliveries enable row level security;
alter table public.support_automation_state enable row level security;

drop policy if exists "Support requests are readable by owner" on public.support_requests;
create policy "Support requests are readable by owner"
on public.support_requests
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Push notification devices are readable by owner" on public.push_notification_devices;
create policy "Push notification devices are readable by owner"
on public.push_notification_devices
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Support nudge push deliveries are readable by owner" on public.support_nudge_push_deliveries;
create policy "Support nudge push deliveries are readable by owner"
on public.support_nudge_push_deliveries
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.support_local_date(
  input_ts timestamptz,
  input_timezone text
)
returns date
language sql
stable
as $$
  select timezone(coalesce(nullif(trim(input_timezone), ''), 'UTC'), input_ts)::date;
$$;

create or replace function public.support_week_start(input_date date)
returns date
language sql
immutable
as $$
  select (input_date - ((extract(isodow from input_date)::int) - 1));
$$;

create or replace function public.support_weight_to_lb(
  input_weight numeric,
  input_unit public.weight_unit
)
returns numeric
language sql
immutable
as $$
  select case
    when input_weight is null then null
    when input_unit = 'kg' then input_weight * 2.2046226218487757
    else input_weight
  end;
$$;

create or replace function public.compute_support_weekly_target_miss(
  p_user_id uuid,
  p_week_start date,
  p_as_of_date date,
  p_gym_target integer,
  p_goal_type public.goal_type,
  p_target_min numeric,
  p_target_max numeric,
  p_preferred_unit public.weight_unit,
  p_include_as_of_day boolean default true
)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  week_end date := p_week_start + 6;
  as_of_date date := least(greatest(p_as_of_date, p_week_start), week_end);
  verified_count integer := 0;
  remaining_days integer := 0;
  impossible_by_gym boolean := false;
  weight_off_goal boolean := false;
  current_count integer := 0;
  previous_count integer := 0;
  current_avg_lb numeric := null;
  previous_avg_lb numeric := null;
  target_min_lb numeric := null;
  target_max_lb numeric := null;
  lose_threshold_lb numeric := 2.0;
  gain_threshold_lb numeric := 3.0;
  prev_week_start date := p_week_start - 7;
  prev_week_end date := week_end - 7;
begin
  select count(*)::int
  into verified_count
  from public.gym_sessions
  where user_id = p_user_id
    and status = 'verified'
    and session_date >= p_week_start
    and session_date <= as_of_date;

  if coalesce(p_include_as_of_day, true) then
    remaining_days := (week_end - as_of_date) + 1;
  else
    remaining_days := greatest((week_end - as_of_date), 0);
  end if;

  impossible_by_gym := (verified_count + remaining_days) < greatest(coalesce(p_gym_target, 4), 0);

  if as_of_date = week_end then
    select
      count(*)::int,
      avg(public.support_weight_to_lb(weight, unit))
    into current_count, current_avg_lb
    from public.weigh_ins
    where user_id = p_user_id
      and local_date >= p_week_start
      and local_date <= week_end;

    select
      count(*)::int,
      avg(public.support_weight_to_lb(weight, unit))
    into previous_count, previous_avg_lb
    from public.weigh_ins
    where user_id = p_user_id
      and local_date >= prev_week_start
      and local_date <= prev_week_end;

    if current_count >= 4
      and previous_count >= 4
      and current_avg_lb is not null
      and previous_avg_lb is not null
    then
      if p_goal_type = 'maintain' then
        if p_target_min is not null and p_target_max is not null then
          if p_preferred_unit = 'kg' then
            target_min_lb := p_target_min * 2.2046226218487757;
            target_max_lb := p_target_max * 2.2046226218487757;
          else
            target_min_lb := p_target_min;
            target_max_lb := p_target_max;
          end if;

          weight_off_goal := current_avg_lb < target_min_lb
            or current_avg_lb > target_max_lb;
        end if;
      elsif p_goal_type = 'lose' then
        if p_preferred_unit = 'kg' then
          lose_threshold_lb := 0.9 * 2.2046226218487757;
        end if;

        weight_off_goal := current_avg_lb >= (previous_avg_lb + lose_threshold_lb);
      elsif p_goal_type = 'gain' then
        if p_preferred_unit = 'kg' then
          gain_threshold_lb := 1.36 * 2.2046226218487757;
        end if;

        weight_off_goal := current_avg_lb <= (previous_avg_lb - gain_threshold_lb);
      end if;
    end if;
  end if;

  return impossible_by_gym or weight_off_goal;
end;
$$;

create or replace function public.insert_support_automation_analytics_event(
  p_user_id uuid,
  p_user_tier public.membership_tier,
  p_event_name text,
  p_trigger_reason public.support_trigger_reason default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.analytics_events (
    user_id,
    event_name,
    occurred_at,
    coach_persona,
    specialization,
    user_tier,
    source,
    metadata
  )
  values (
    p_user_id,
    p_event_name,
    now(),
    'accountability:system',
    'workout',
    p_user_tier,
    'backend',
    case
      when p_trigger_reason is null then coalesce(p_metadata, '{}'::jsonb)
      else coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('trigger_reason', p_trigger_reason)
    end
  );
exception
  when others then
    -- Analytics writes are best-effort and should not block accountability flows.
    null;
end;
$$;

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
  order by sr.created_at desc
  limit 1;
end;
$$;

create or replace function public.mark_support_nudge_opened(
  p_request_id uuid,
  p_surface public.support_nudge_surface
)
returns table (
  request_id uuid,
  nudge_opened_at timestamptz,
  nudge_opened_surface public.support_nudge_surface,
  was_first_open boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  request_row public.support_requests%rowtype;
  member_tier public.membership_tier := 'free';
  first_open boolean := false;
begin
  if current_user_id is null then
    raise exception 'Missing user session.';
  end if;

  select *
  into request_row
  from public.support_requests
  where id = p_request_id
    and user_id = current_user_id
  for update;

  if request_row.id is null then
    raise exception 'Support request not found.';
  end if;

  if request_row.nudge_opened_at is null then
    update public.support_requests
    set
      nudge_opened_at = now(),
      nudge_opened_surface = p_surface,
      updated_at = now()
    where id = request_row.id
    returning * into request_row;

    first_open := true;

    select coalesce(membership_tier, 'free'::public.membership_tier)
    into member_tier
    from public.profiles
    where id = current_user_id;

    perform public.insert_support_automation_analytics_event(
      p_user_id := current_user_id,
      p_user_tier := member_tier,
      p_event_name := 'private_nudge_opened',
      p_trigger_reason := request_row.trigger_reason,
      p_metadata := jsonb_build_object(
        'surface', p_surface,
        'support_request_id', request_row.id,
        'status', request_row.status
      )
    );
  end if;

  return query
  select
    request_row.id,
    request_row.nudge_opened_at,
    request_row.nudge_opened_surface,
    first_open;
end;
$$;

create or replace function public.set_auto_support_enabled(enabled boolean)
returns table (
  auto_support_enabled boolean,
  changed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_enabled boolean := true;
  member_tier public.membership_tier := 'free';
  changed_value boolean := false;
begin
  if current_user_id is null then
    raise exception 'Missing user session.';
  end if;

  select
    coalesce(auto_support_enabled, true),
    coalesce(membership_tier, 'free'::public.membership_tier)
  into current_enabled, member_tier
  from public.profiles
  where id = current_user_id
  for update;

  if current_enabled is distinct from enabled then
    changed_value := true;
  end if;

  update public.profiles
  set auto_support_enabled = enabled,
      updated_at = now()
  where id = current_user_id;

  if changed_value then
    perform public.insert_support_automation_analytics_event(
      p_user_id := current_user_id,
      p_user_tier := member_tier,
      p_event_name := 'support_auto_post_setting_changed',
      p_trigger_reason := null,
      p_metadata := jsonb_build_object(
        'auto_support_enabled', enabled
      )
    );
  end if;

  return query
  select enabled, changed_value;
end;
$$;

create or replace function public.grant_auto_support_consent()
returns table (
  auto_support_consent_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  consented_at timestamptz;
begin
  if current_user_id is null then
    raise exception 'Missing user session.';
  end if;

  update public.profiles
  set
    auto_support_consent_at = coalesce(auto_support_consent_at, now()),
    updated_at = now()
  where id = current_user_id
  returning auto_support_consent_at into consented_at;

  return query
  select consented_at;
end;
$$;

create or replace function public.register_push_notification_device(
  p_expo_push_token text,
  p_platform text,
  p_app_version text
)
returns table (
  id uuid,
  expo_push_token text,
  is_active boolean,
  last_registered_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_token text := trim(coalesce(p_expo_push_token, ''));
  normalized_platform text := trim(coalesce(p_platform, 'unknown'));
  normalized_app_version text := nullif(trim(coalesce(p_app_version, '')), '');
  row_out public.push_notification_devices%rowtype;
begin
  if current_user_id is null then
    raise exception 'Missing user session.';
  end if;

  if normalized_token = '' then
    raise exception 'Push token is required.';
  end if;

  insert into public.push_notification_devices (
    user_id,
    expo_push_token,
    platform,
    app_version,
    is_active,
    last_registered_at,
    last_error
  )
  values (
    current_user_id,
    normalized_token,
    normalized_platform,
    normalized_app_version,
    true,
    now(),
    null
  )
  on conflict (user_id, expo_push_token)
  do update set
    platform = excluded.platform,
    app_version = excluded.app_version,
    is_active = true,
    last_registered_at = now(),
    last_error = null,
    updated_at = now()
  returning * into row_out;

  return query
  select row_out.id, row_out.expo_push_token, row_out.is_active, row_out.last_registered_at;
end;
$$;

create or replace function public.claim_support_nudge_push_deliveries(
  limit_count integer default 100
)
returns table (
  id uuid,
  request_id uuid,
  user_id uuid,
  expo_push_token text,
  message_title text,
  message_body text,
  attempt_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  clamped_limit integer := greatest(1, least(coalesce(limit_count, 100), 500));
begin
  return query
  with candidate as (
    select d.id
    from public.support_nudge_push_deliveries as d
    where d.status = 'pending'
      and d.next_attempt_at <= now()
    order by d.next_attempt_at asc, d.created_at asc
    for update skip locked
    limit clamped_limit
  ),
  updated_rows as (
    update public.support_nudge_push_deliveries as d
    set
      attempt_count = d.attempt_count + 1,
      next_attempt_at = now() + interval '5 minutes',
      last_attempt_at = now(),
      updated_at = now()
    from candidate
    where d.id = candidate.id
    returning
      d.id,
      d.request_id,
      d.user_id,
      d.expo_push_token,
      d.message_title,
      d.message_body,
      d.attempt_count
  )
  select
    updated_rows.id,
    updated_rows.request_id,
    updated_rows.user_id,
    updated_rows.expo_push_token,
    updated_rows.message_title,
    updated_rows.message_body,
    updated_rows.attempt_count
  from updated_rows;
end;
$$;

create or replace function public.complete_support_nudge_push_delivery(
  p_delivery_id uuid,
  p_status public.push_delivery_status,
  p_error_message text default null
)
returns table (
  id uuid,
  status public.push_delivery_status,
  attempt_count integer,
  next_attempt_at timestamptz,
  sent_at timestamptz,
  last_error text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  delivery_row public.support_nudge_push_deliveries%rowtype;
  retry_delay interval := interval '10 minutes';
begin
  select *
  into delivery_row
  from public.support_nudge_push_deliveries
  where id = p_delivery_id
  for update;

  if delivery_row.id is null then
    raise exception 'Push delivery not found.';
  end if;

  if p_status = 'sent' then
    update public.support_nudge_push_deliveries
    set
      status = 'sent',
      sent_at = now(),
      last_error = null,
      updated_at = now()
    where id = delivery_row.id
    returning * into delivery_row;
  else
    if delivery_row.attempt_count >= 3 then
      update public.support_nudge_push_deliveries
      set
        status = 'failed',
        last_error = nullif(trim(coalesce(p_error_message, '')), ''),
        updated_at = now()
      where id = delivery_row.id
      returning * into delivery_row;
    else
      if delivery_row.attempt_count = 1 then
        retry_delay := interval '10 minutes';
      elsif delivery_row.attempt_count = 2 then
        retry_delay := interval '20 minutes';
      else
        retry_delay := interval '30 minutes';
      end if;

      update public.support_nudge_push_deliveries
      set
        status = 'pending',
        next_attempt_at = now() + retry_delay,
        last_error = nullif(trim(coalesce(p_error_message, '')), ''),
        updated_at = now()
      where id = delivery_row.id
      returning * into delivery_row;
    end if;
  end if;

  return query
  select
    delivery_row.id,
    delivery_row.status,
    delivery_row.attempt_count,
    delivery_row.next_attempt_at,
    delivery_row.sent_at,
    delivery_row.last_error;
end;
$$;

create or replace function public.evaluate_support_for_due_users(run_at timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row record;
  local_today date;
  local_week_start date;
  local_week_end date;
  previous_week_start date;
  previous_week_end date;
  has_support_request_this_week boolean;
  verified_week_count integer;
  close_friend_count integer;
  missed_trajectory_3_days boolean;
  missed_weekly_target boolean;
  previous_week_missed_weekly_target boolean;
  resolved_reason public.support_trigger_reason;
  resolved_status public.support_request_status;
  published_post_id uuid;
  created_request_id uuid;
  processed_count integer := 0;
  created_count integer := 0;
  day_has_session boolean;
  i integer;
  day_cursor date;
  support_post_body text;
begin
  for profile_row in
    select
      p.id as user_id,
      coalesce(nullif(trim(p.timezone), ''), 'UTC') as timezone,
      coalesce(p.auto_support_enabled, true) as auto_support_enabled,
      p.auto_support_consent_at,
      coalesce(p.membership_tier, 'free'::public.membership_tier) as membership_tier,
      coalesce(p.preferred_unit, 'lb'::public.weight_unit) as preferred_unit,
      coalesce(r.gym_sessions_target, 4) as gym_sessions_target,
      g.goal_type,
      g.target_min,
      g.target_max,
      sas.last_evaluated_local_date
    from public.profiles as p
    left join public.routines as r
      on r.user_id = p.id
    left join public.goals as g
      on g.user_id = p.id
     and g.is_active = true
    left join public.support_automation_state as sas
      on sas.user_id = p.id
  loop
    local_today := public.support_local_date(run_at, profile_row.timezone);

    if profile_row.last_evaluated_local_date = local_today then
      continue;
    end if;

    processed_count := processed_count + 1;
    local_week_start := public.support_week_start(local_today);
    local_week_end := local_week_start + 6;
    previous_week_start := local_week_start - 7;
    previous_week_end := local_week_end - 7;

    select exists (
      select 1
      from public.support_requests as sr
      where sr.user_id = profile_row.user_id
        and sr.week_start = local_week_start
    )
    into has_support_request_this_week;

    if has_support_request_this_week then
      insert into public.support_automation_state (
        user_id,
        last_evaluated_local_date,
        last_evaluated_at
      )
      values (
        profile_row.user_id,
        local_today,
        now()
      )
      on conflict (user_id)
      do update set
        last_evaluated_local_date = excluded.last_evaluated_local_date,
        last_evaluated_at = excluded.last_evaluated_at,
        updated_at = now();
      continue;
    end if;

    select count(*)::int
    into verified_week_count
    from public.gym_sessions
    where user_id = profile_row.user_id
      and status = 'verified'
      and session_date >= local_week_start
      and session_date <= local_today;

    missed_trajectory_3_days := verified_week_count < profile_row.gym_sessions_target;

    if missed_trajectory_3_days then
      for i in 0..2 loop
        day_cursor := local_today - i;

        select exists (
          select 1
          from public.gym_sessions
          where user_id = profile_row.user_id
            and session_date = day_cursor
        )
        into day_has_session;

        if day_has_session then
          missed_trajectory_3_days := false;
          exit;
        end if;
      end loop;
    end if;

    missed_weekly_target := public.compute_support_weekly_target_miss(
      p_user_id := profile_row.user_id,
      p_week_start := local_week_start,
      p_as_of_date := local_today,
      p_gym_target := profile_row.gym_sessions_target,
      p_goal_type := profile_row.goal_type,
      p_target_min := profile_row.target_min,
      p_target_max := profile_row.target_max,
      p_preferred_unit := profile_row.preferred_unit,
      p_include_as_of_day := true
    );

    previous_week_missed_weekly_target := public.compute_support_weekly_target_miss(
      p_user_id := profile_row.user_id,
      p_week_start := previous_week_start,
      p_as_of_date := previous_week_end,
      p_gym_target := profile_row.gym_sessions_target,
      p_goal_type := profile_row.goal_type,
      p_target_min := profile_row.target_min,
      p_target_max := profile_row.target_max,
      p_preferred_unit := profile_row.preferred_unit,
      p_include_as_of_day := false
    );

    resolved_reason := null;

    if missed_weekly_target and previous_week_missed_weekly_target then
      resolved_reason := 'two_consecutive_missed_weeks';
    elsif missed_weekly_target then
      resolved_reason := 'missed_weekly_target';
    elsif missed_trajectory_3_days then
      resolved_reason := 'miss_trajectory_3_days';
    end if;

    if resolved_reason is null then
      insert into public.support_automation_state (
        user_id,
        last_evaluated_local_date,
        last_evaluated_at
      )
      values (
        profile_row.user_id,
        local_today,
        now()
      )
      on conflict (user_id)
      do update set
        last_evaluated_local_date = excluded.last_evaluated_local_date,
        last_evaluated_at = excluded.last_evaluated_at,
        updated_at = now();
      continue;
    end if;

    select count(*)::int
    into close_friend_count
    from public.close_friends
    where user_id = profile_row.user_id;

    published_post_id := null;

    if profile_row.auto_support_enabled = false or close_friend_count <= 0 then
      resolved_status := 'disabled';
    elsif profile_row.auto_support_consent_at is null then
      resolved_status := 'suppressed_no_consent';
    else
      resolved_status := 'published';

      support_post_body := case resolved_reason
        when 'two_consecutive_missed_weeks' then 'Could use a little extra accountability this week. Appreciate your support.'
        when 'missed_weekly_target' then 'I am behind on my weekly target and getting back on track now. Appreciate support.'
        else 'Fell off pace for a few days and recommitting this week. Appreciate support.'
      end;

      insert into public.posts (
        author_user_id,
        post_type,
        body,
        media_paths,
        visibility
      )
      values (
        profile_row.user_id,
        'text',
        support_post_body,
        null,
        'close_friends'
      )
      returning id into published_post_id;
    end if;

    insert into public.support_requests (
      user_id,
      week_start,
      week_end,
      trigger_reason,
      status,
      outcome_post_id
    )
    values (
      profile_row.user_id,
      local_week_start,
      local_week_end,
      resolved_reason,
      resolved_status,
      published_post_id
    )
    on conflict (user_id, week_start) do nothing
    returning id into created_request_id;

    if created_request_id is null then
      if published_post_id is not null then
        delete from public.posts
        where id = published_post_id;
      end if;

      insert into public.support_automation_state (
        user_id,
        last_evaluated_local_date,
        last_evaluated_at
      )
      values (
        profile_row.user_id,
        local_today,
        now()
      )
      on conflict (user_id)
      do update set
        last_evaluated_local_date = excluded.last_evaluated_local_date,
        last_evaluated_at = excluded.last_evaluated_at,
        updated_at = now();

      continue;
    end if;

    created_count := created_count + 1;

    insert into public.support_nudge_push_deliveries (
      request_id,
      user_id,
      device_id,
      expo_push_token,
      message_title,
      message_body
    )
    select
      created_request_id,
      profile_row.user_id,
      pnd.id,
      pnd.expo_push_token,
      'You''re off pace this week.',
      'Open Stabilify for your next step.'
    from public.push_notification_devices as pnd
    where pnd.user_id = profile_row.user_id
      and pnd.is_active = true;

    perform public.insert_support_automation_analytics_event(
      p_user_id := profile_row.user_id,
      p_user_tier := profile_row.membership_tier,
      p_event_name := 'private_nudge_sent',
      p_trigger_reason := resolved_reason,
      p_metadata := jsonb_build_object(
        'support_request_id', created_request_id,
        'status', resolved_status
      )
    );

    if resolved_status = 'published' then
      perform public.insert_support_automation_analytics_event(
        p_user_id := profile_row.user_id,
        p_user_tier := profile_row.membership_tier,
        p_event_name := 'support_auto_post_published',
        p_trigger_reason := resolved_reason,
        p_metadata := jsonb_build_object(
          'support_request_id', created_request_id,
          'post_id', published_post_id
        )
      );
    elsif resolved_status = 'suppressed_no_consent' then
      perform public.insert_support_automation_analytics_event(
        p_user_id := profile_row.user_id,
        p_user_tier := profile_row.membership_tier,
        p_event_name := 'support_auto_post_suppressed_no_consent',
        p_trigger_reason := resolved_reason,
        p_metadata := jsonb_build_object(
          'support_request_id', created_request_id
        )
      );
    end if;

    insert into public.support_automation_state (
      user_id,
      last_evaluated_local_date,
      last_evaluated_at
    )
    values (
      profile_row.user_id,
      local_today,
      now()
    )
    on conflict (user_id)
    do update set
      last_evaluated_local_date = excluded.last_evaluated_local_date,
      last_evaluated_at = excluded.last_evaluated_at,
      updated_at = now();
  end loop;

  return jsonb_build_object(
    'processed_count', processed_count,
    'created_count', created_count,
    'evaluated_at', run_at
  );
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
      'support_auto_post_setting_changed'
    )
  );

revoke all on function public.fetch_current_week_support_request() from public;
revoke all on function public.mark_support_nudge_opened(uuid, public.support_nudge_surface) from public;
revoke all on function public.set_auto_support_enabled(boolean) from public;
revoke all on function public.grant_auto_support_consent() from public;
revoke all on function public.register_push_notification_device(text, text, text) from public;
revoke all on function public.evaluate_support_for_due_users(timestamptz) from public;
revoke all on function public.claim_support_nudge_push_deliveries(integer) from public;
revoke all on function public.complete_support_nudge_push_delivery(uuid, public.push_delivery_status, text) from public;

revoke all on function public.fetch_current_week_support_request() from authenticated;
revoke all on function public.mark_support_nudge_opened(uuid, public.support_nudge_surface) from authenticated;
revoke all on function public.set_auto_support_enabled(boolean) from authenticated;
revoke all on function public.grant_auto_support_consent() from authenticated;
revoke all on function public.register_push_notification_device(text, text, text) from authenticated;
revoke all on function public.evaluate_support_for_due_users(timestamptz) from authenticated;
revoke all on function public.claim_support_nudge_push_deliveries(integer) from authenticated;
revoke all on function public.complete_support_nudge_push_delivery(uuid, public.push_delivery_status, text) from authenticated;

grant execute on function public.fetch_current_week_support_request() to authenticated;
grant execute on function public.mark_support_nudge_opened(uuid, public.support_nudge_surface) to authenticated;
grant execute on function public.set_auto_support_enabled(boolean) to authenticated;
grant execute on function public.grant_auto_support_consent() to authenticated;
grant execute on function public.register_push_notification_device(text, text, text) to authenticated;

grant execute on function public.evaluate_support_for_due_users(timestamptz) to service_role;
grant execute on function public.claim_support_nudge_push_deliveries(integer) to service_role;
grant execute on function public.complete_support_nudge_push_delivery(uuid, public.push_delivery_status, text) to service_role;

revoke all on table public.support_requests from public;
revoke all on table public.push_notification_devices from public;
revoke all on table public.support_nudge_push_deliveries from public;
revoke all on table public.support_automation_state from public;

grant select on table public.support_requests to authenticated;
grant select on table public.push_notification_devices to authenticated;
grant select on table public.support_nudge_push_deliveries to authenticated;

do $$
declare
  evaluator_job_id bigint;
  push_job_id bigint;
  supabase_url text;
  dispatch_token text;
  dispatch_sql text;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    select jobid into evaluator_job_id
    from cron.job
    where jobname = 'support-evaluator-hourly';

    if evaluator_job_id is not null then
      perform cron.unschedule(evaluator_job_id);
    end if;

    perform cron.schedule(
      'support-evaluator-hourly',
      '5 * * * *',
      'select public.evaluate_support_for_due_users(now());'
    );

    if exists (select 1 from pg_extension where extname = 'pg_net')
      and exists (select 1 from pg_extension where extname = 'vault')
    then
      select current_setting('app.settings.supabase_url', true)
      into supabase_url;

      select decrypted_secret
      into dispatch_token
      from vault.decrypted_secrets
      where name = 'support_push_dispatch_token'
      limit 1;

      if supabase_url is not null and dispatch_token is not null then
        dispatch_sql := format(
          $fmt$
          select net.http_post(
            url := %L,
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'x-support-dispatch-token', %L
            ),
            body := '{}'::jsonb
          );
          $fmt$,
          supabase_url || '/functions/v1/support-nudge-push-dispatch',
          dispatch_token
        );

        select jobid into push_job_id
        from cron.job
        where jobname = 'support-push-dispatch-10m';

        if push_job_id is not null then
          perform cron.unschedule(push_job_id);
        end if;

        perform cron.schedule(
          'support-push-dispatch-10m',
          '*/10 * * * *',
          dispatch_sql
        );
      end if;
    end if;
  end if;
end;
$$;
