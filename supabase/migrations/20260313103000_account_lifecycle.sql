do $$
begin
  create type public.account_lifecycle_status as enum ('active', 'pending_deletion');
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists account_status public.account_lifecycle_status not null default 'active'::public.account_lifecycle_status,
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists scheduled_purge_at timestamptz,
  add column if not exists deletion_legal_hold_at timestamptz,
  add column if not exists deletion_legal_hold_reason text;

create index if not exists profiles_pending_deletion_idx
on public.profiles (scheduled_purge_at)
where account_status = 'pending_deletion'::public.account_lifecycle_status;

create or replace function public.sync_profile_directory_from_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.profile_directory
    where user_id = old.id;
    return old;
  end if;

  if new.account_status <> 'active'::public.account_lifecycle_status then
    delete from public.profile_directory
    where user_id = new.id;
    return new;
  end if;

  insert into public.profile_directory (
    user_id,
    username,
    display_name,
    bio,
    avatar_path,
    account_visibility,
    progress_visibility,
    updated_at
  )
  values (
    new.id,
    new.username,
    new.display_name,
    coalesce((new.bio)::text, ''),
    new.avatar_path,
    new.account_visibility,
    new.progress_visibility,
    now()
  )
  on conflict (user_id)
  do update set
    username = excluded.username,
    display_name = excluded.display_name,
    bio = excluded.bio,
    avatar_path = excluded.avatar_path,
    account_visibility = excluded.account_visibility,
    progress_visibility = excluded.progress_visibility,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists profiles_sync_profile_directory_upsert on public.profiles;
create trigger profiles_sync_profile_directory_upsert
after insert or update of username, display_name, bio, avatar_path, account_visibility, progress_visibility, account_status
on public.profiles
for each row
execute function public.sync_profile_directory_from_profiles();

delete from public.profile_directory as pd
using public.profiles as p
where p.id = pd.user_id
  and p.account_status <> 'active'::public.account_lifecycle_status;

insert into public.profile_directory (
  user_id,
  username,
  display_name,
  bio,
  avatar_path,
  account_visibility,
  progress_visibility,
  updated_at
)
select
  p.id,
  p.username,
  p.display_name,
  coalesce((p.bio)::text, ''),
  p.avatar_path,
  p.account_visibility,
  p.progress_visibility,
  now()
from public.profiles as p
where p.account_status = 'active'::public.account_lifecycle_status
on conflict (user_id)
do update set
  username = excluded.username,
  display_name = excluded.display_name,
  bio = excluded.bio,
  avatar_path = excluded.avatar_path,
  account_visibility = excluded.account_visibility,
  progress_visibility = excluded.progress_visibility,
  updated_at = now();

drop policy if exists "Profiles are readable by audience" on public.profiles;
create policy "Profiles are readable by audience"
on public.profiles
for select
using (
  auth.uid() = id
  or (
    profiles.account_status = 'active'::public.account_lifecycle_status
    and not public.has_user_blocked(profiles.id, auth.uid())
    and not public.has_user_blocked(auth.uid(), profiles.id)
    and (
      account_visibility = 'public'::public.account_visibility
      or exists (
        select 1
        from public.follows as f
        where f.follower_user_id = auth.uid()
          and f.followed_user_id = profiles.id
          and f.status = 'accepted'::public.follow_status
      )
      or exists (
        select 1
        from public.close_friends as cf
        where cf.user_id = profiles.id
          and cf.friend_user_id = auth.uid()
      )
    )
  )
);

drop policy if exists "Posts are readable by audience" on public.posts;
create policy "Posts are readable by audience"
on public.posts
for select
using (
  auth.uid() = author_user_id
  or (
    exists (
      select 1
      from public.profiles as p
      where p.id = posts.author_user_id
        and p.account_status = 'active'::public.account_lifecycle_status
    )
    and not public.has_user_blocked(posts.author_user_id, auth.uid())
    and not public.has_user_blocked(auth.uid(), posts.author_user_id)
    and (
      visibility = 'public'::public.share_visibility
      or (
        visibility = 'followers'::public.share_visibility
        and exists (
          select 1
          from public.follows as f
          where f.follower_user_id = auth.uid()
            and f.followed_user_id = posts.author_user_id
            and f.status = 'accepted'::public.follow_status
        )
      )
      or (
        visibility = 'close_friends'::public.share_visibility
        and exists (
          select 1
          from public.close_friends as cf
          where cf.user_id = posts.author_user_id
            and cf.friend_user_id = auth.uid()
        )
      )
    )
  )
);

drop policy if exists "Weigh-ins are readable by progress audience" on public.weigh_ins;
create policy "Weigh-ins are readable by progress audience"
on public.weigh_ins
for select
using (
  auth.uid() = user_id
  or (
    not public.has_user_blocked(weigh_ins.user_id, auth.uid())
    and not public.has_user_blocked(auth.uid(), weigh_ins.user_id)
    and exists (
      select 1
      from public.profiles as p
      where p.id = weigh_ins.user_id
        and p.account_status = 'active'::public.account_lifecycle_status
        and p.account_visibility = 'public'::public.account_visibility
        and p.progress_visibility = 'public'::public.account_visibility
    )
  )
);

drop policy if exists "Gym sessions are readable by progress audience" on public.gym_sessions;
create policy "Gym sessions are readable by progress audience"
on public.gym_sessions
for select
using (
  auth.uid() = user_id
  or (
    not public.has_user_blocked(gym_sessions.user_id, auth.uid())
    and not public.has_user_blocked(auth.uid(), gym_sessions.user_id)
    and exists (
      select 1
      from public.profiles as p
      where p.id = gym_sessions.user_id
        and p.account_status = 'active'::public.account_lifecycle_status
        and p.account_visibility = 'public'::public.account_visibility
        and p.progress_visibility = 'public'::public.account_visibility
    )
  )
);

drop policy if exists "Routines are readable by progress audience" on public.routines;
create policy "Routines are readable by progress audience"
on public.routines
for select
using (
  auth.uid() = user_id
  or (
    not public.has_user_blocked(routines.user_id, auth.uid())
    and not public.has_user_blocked(auth.uid(), routines.user_id)
    and exists (
      select 1
      from public.profiles as p
      where p.id = routines.user_id
        and p.account_status = 'active'::public.account_lifecycle_status
        and p.account_visibility = 'public'::public.account_visibility
        and p.progress_visibility = 'public'::public.account_visibility
    )
  )
);

create or replace function public.request_account_deletion()
returns table (
  account_status public.account_lifecycle_status,
  deletion_requested_at timestamptz,
  scheduled_purge_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  updated_profile public.profiles%rowtype;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to delete your account.';
  end if;

  update public.profiles
  set
    account_status = 'pending_deletion'::public.account_lifecycle_status,
    deletion_requested_at = now(),
    scheduled_purge_at = now() + interval '30 days'
  where id = current_user_id
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile not found.';
  end if;

  update public.support_nudge_push_deliveries
  set
    status = 'failed'::public.push_delivery_status,
    last_error = 'Account pending deletion.',
    updated_at = now()
  where user_id = current_user_id
    and status = 'pending'::public.push_delivery_status;

  return query
  select
    updated_profile.account_status,
    updated_profile.deletion_requested_at,
    updated_profile.scheduled_purge_at;
end;
$$;

create or replace function public.restore_pending_account_deletion()
returns table (
  account_status public.account_lifecycle_status,
  deletion_requested_at timestamptz,
  scheduled_purge_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  updated_profile public.profiles%rowtype;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to restore your account.';
  end if;

  update public.profiles
  set
    account_status = 'active'::public.account_lifecycle_status,
    deletion_requested_at = null,
    scheduled_purge_at = null
  where id = current_user_id
    and account_status = 'pending_deletion'::public.account_lifecycle_status
    and scheduled_purge_at > now()
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Your account can no longer be restored.';
  end if;

  return query
  select
    updated_profile.account_status,
    updated_profile.deletion_requested_at,
    updated_profile.scheduled_purge_at;
end;
$$;

revoke all on function public.request_account_deletion() from public;
revoke all on function public.request_account_deletion() from authenticated;
grant execute on function public.request_account_deletion() to authenticated;

revoke all on function public.restore_pending_account_deletion() from public;
revoke all on function public.restore_pending_account_deletion() from authenticated;
grant execute on function public.restore_pending_account_deletion() to authenticated;

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
    inner join public.profiles as p
      on p.id = d.user_id
    where d.status = 'pending'
      and d.next_attempt_at <= now()
      and p.account_status = 'active'::public.account_lifecycle_status
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
    where p.account_status = 'active'::public.account_lifecycle_status
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

do $$
declare
  purge_job_id bigint;
  supabase_url text;
  purge_token text;
  purge_sql text;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
    and exists (select 1 from pg_extension where extname = 'pg_net')
    and exists (select 1 from pg_extension where extname = 'vault')
  then
    select current_setting('app.settings.supabase_url', true)
    into supabase_url;

    select decrypted_secret
    into purge_token
    from vault.decrypted_secrets
    where name = 'account_deletion_purge_token'
    limit 1;

    if supabase_url is not null and purge_token is not null then
      purge_sql := format(
        $fmt$
        select net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-account-deletion-token', %L
          ),
          body := '{}'::jsonb
        );
        $fmt$,
        supabase_url || '/functions/v1/account-deletion',
        purge_token
      );

      select jobid into purge_job_id
      from cron.job
      where jobname = 'account-deletion-purge-hourly';

      if purge_job_id is not null then
        perform cron.unschedule(purge_job_id);
      end if;

      perform cron.schedule(
        'account-deletion-purge-hourly',
        '17 * * * *',
        purge_sql
      );
    end if;
  end if;
end;
$$;
