alter table public.profiles
  add column if not exists progress_visibility public.account_visibility;

update public.profiles
set progress_visibility = coalesce(progress_visibility, 'public'::public.account_visibility)
where progress_visibility is null;

alter table public.profiles
  alter column progress_visibility set default 'public'::public.account_visibility,
  alter column progress_visibility set not null;
