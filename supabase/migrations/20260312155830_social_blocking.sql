create or replace function public.has_user_blocked(
  blocker_user_id uuid,
  target_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.follows as f
    where f.follower_user_id = blocker_user_id
      and f.followed_user_id = target_user_id
      and f.status = 'blocked'::public.follow_status
  );
$$;

create or replace function public.block_user(target_user_id uuid)
returns table (
  blocked_user_id uuid,
  status public.follow_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Missing user session.';
  end if;

  if target_user_id is null then
    raise exception 'Target user is required.';
  end if;

  if target_user_id = current_user_id then
    raise exception 'You cannot block yourself.';
  end if;

  insert into public.follows (
    follower_user_id,
    followed_user_id,
    status
  )
  values (
    current_user_id,
    target_user_id,
    'blocked'::public.follow_status
  )
  on conflict (follower_user_id, followed_user_id)
  do update set
    status = 'blocked'::public.follow_status,
    updated_at = now();

  delete from public.follows as f
  where f.follower_user_id = target_user_id
    and f.followed_user_id = current_user_id;

  delete from public.close_friends as cf
  where (cf.user_id = current_user_id and cf.friend_user_id = target_user_id)
     or (cf.user_id = target_user_id and cf.friend_user_id = current_user_id);

  return query
  select target_user_id, 'blocked'::public.follow_status;
end;
$$;

create or replace function public.unblock_user(target_user_id uuid)
returns table (
  unblocked_user_id uuid,
  removed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  deleted_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Missing user session.';
  end if;

  if target_user_id is null then
    raise exception 'Target user is required.';
  end if;

  delete from public.follows as f
  where f.follower_user_id = current_user_id
    and f.followed_user_id = target_user_id
    and f.status = 'blocked'::public.follow_status;

  get diagnostics deleted_count = row_count;

  return query
  select target_user_id, deleted_count > 0;
end;
$$;

drop policy if exists "Profile directory is readable by authenticated users" on public.profile_directory;
create policy "Profile directory is readable by authenticated users"
on public.profile_directory
for select
to authenticated
using (
  auth.uid() = user_id
  or not public.has_user_blocked(user_id, auth.uid())
);

drop policy if exists "Profiles are readable by audience" on public.profiles;
create policy "Profiles are readable by audience"
on public.profiles
for select
using (
  auth.uid() = id
  or (
    not public.has_user_blocked(profiles.id, auth.uid())
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
    not public.has_user_blocked(posts.author_user_id, auth.uid())
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
    and exists (
      select 1
      from public.profiles as p
      where p.id = weigh_ins.user_id
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
    and exists (
      select 1
      from public.profiles as p
      where p.id = gym_sessions.user_id
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
    and exists (
      select 1
      from public.profiles as p
      where p.id = routines.user_id
        and p.account_visibility = 'public'::public.account_visibility
        and p.progress_visibility = 'public'::public.account_visibility
    )
  )
);

grant execute on function public.has_user_blocked(uuid, uuid) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
