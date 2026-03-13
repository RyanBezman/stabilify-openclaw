drop policy if exists "Profiles are readable by audience" on public.profiles;
create policy "Profiles are readable by audience"
on public.profiles
for select
using (
  auth.uid() = id
  or (
    not public.has_user_blocked(profiles.id, auth.uid())
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
    not public.has_user_blocked(posts.author_user_id, auth.uid())
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
        and p.account_visibility = 'public'::public.account_visibility
        and p.progress_visibility = 'public'::public.account_visibility
    )
  )
);
