drop policy if exists "Profiles are readable by owner" on public.profiles;

create policy "Profiles are readable by audience"
on public.profiles
for select
using (
  auth.uid() = id
  or account_visibility = 'public'::public.account_visibility
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
);
