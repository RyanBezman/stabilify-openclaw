drop policy if exists "Posts are readable by owner" on public.posts;

create policy "Posts are readable by audience"
on public.posts
for select
using (
  auth.uid() = author_user_id
  or visibility = 'public'::public.share_visibility
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
);

drop policy if exists "Close friends are readable by owner" on public.close_friends;

create policy "Close friends are readable by participants"
on public.close_friends
for select
using (auth.uid() = user_id or auth.uid() = friend_user_id);
