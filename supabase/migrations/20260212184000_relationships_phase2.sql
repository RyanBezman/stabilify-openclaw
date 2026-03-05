do $$ begin
  create type public.follow_status as enum ('pending', 'accepted', 'rejected', 'blocked');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_user_id uuid not null references auth.users(id) on delete cascade,
  followed_user_id uuid not null references auth.users(id) on delete cascade,
  status public.follow_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.follows
  add constraint follows_users_distinct_check
  check (follower_user_id <> followed_user_id);

create unique index if not exists follows_follower_followed_key
on public.follows(follower_user_id, followed_user_id);

create index if not exists follows_followed_status_idx
on public.follows(followed_user_id, status, updated_at desc);

create index if not exists follows_follower_status_idx
on public.follows(follower_user_id, status, updated_at desc);

drop trigger if exists follows_updated_at on public.follows;
create trigger follows_updated_at
before update on public.follows
for each row
execute function public.set_updated_at();

create table if not exists public.close_friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.close_friends
  add constraint close_friends_users_distinct_check
  check (user_id <> friend_user_id);

create unique index if not exists close_friends_user_friend_key
on public.close_friends(user_id, friend_user_id);

create index if not exists close_friends_user_created_at_idx
on public.close_friends(user_id, created_at desc);

alter table public.follows enable row level security;
alter table public.close_friends enable row level security;

create policy "Follows are readable by participants"
on public.follows
for select
using (auth.uid() = follower_user_id or auth.uid() = followed_user_id);

create policy "Follows are insertable by follower"
on public.follows
for insert
with check (auth.uid() = follower_user_id);

create policy "Follows are editable by participants"
on public.follows
for update
using (auth.uid() = follower_user_id or auth.uid() = followed_user_id)
with check (auth.uid() = follower_user_id or auth.uid() = followed_user_id);

create policy "Follows are deletable by participants"
on public.follows
for delete
using (auth.uid() = follower_user_id or auth.uid() = followed_user_id);

create policy "Close friends are readable by owner"
on public.close_friends
for select
using (auth.uid() = user_id);

create policy "Close friends are insertable by owner"
on public.close_friends
for insert
with check (auth.uid() = user_id);

create policy "Close friends are deletable by owner"
on public.close_friends
for delete
using (auth.uid() = user_id);
