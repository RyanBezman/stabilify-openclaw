alter table public.posts
  add column if not exists media_paths text[] null;
