do $$ begin
  create type public.post_type as enum ('text', 'photo');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid not null references auth.users(id) on delete cascade,
  post_type public.post_type not null,
  body text,
  visibility public.share_visibility not null default 'private',
  created_at timestamptz not null default now()
);

create index if not exists posts_author_created_at_idx
on public.posts(author_user_id, created_at desc);

alter table public.posts enable row level security;

create policy "Posts are readable by owner"
on public.posts
for select
using (auth.uid() = author_user_id);

create policy "Posts are insertable by owner"
on public.posts
for insert
with check (auth.uid() = author_user_id);

create policy "Posts are editable by owner"
on public.posts
for update
using (auth.uid() = author_user_id)
with check (auth.uid() = author_user_id);

create policy "Posts are deletable by owner"
on public.posts
for delete
using (auth.uid() = author_user_id);
