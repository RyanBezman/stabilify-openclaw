do $$ begin
  create type public.account_visibility as enum ('private', 'public');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.share_visibility as enum ('private', 'close_friends', 'followers');
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists account_visibility public.account_visibility,
  add column if not exists social_enabled boolean,
  add column if not exists weigh_in_share_visibility public.share_visibility,
  add column if not exists gym_event_share_visibility public.share_visibility,
  add column if not exists post_share_visibility public.share_visibility;

update public.profiles
set
  account_visibility = coalesce(account_visibility, 'private'::public.account_visibility),
  social_enabled = coalesce(social_enabled, false),
  weigh_in_share_visibility = coalesce(weigh_in_share_visibility, 'private'::public.share_visibility),
  gym_event_share_visibility = coalesce(gym_event_share_visibility, 'private'::public.share_visibility),
  post_share_visibility = coalesce(post_share_visibility, 'private'::public.share_visibility)
where
  account_visibility is null
  or social_enabled is null
  or weigh_in_share_visibility is null
  or gym_event_share_visibility is null
  or post_share_visibility is null;

alter table public.profiles
  alter column account_visibility set default 'private'::public.account_visibility,
  alter column account_visibility set not null,
  alter column social_enabled set default false,
  alter column social_enabled set not null,
  alter column weigh_in_share_visibility set default 'private'::public.share_visibility,
  alter column weigh_in_share_visibility set not null,
  alter column gym_event_share_visibility set default 'private'::public.share_visibility,
  alter column gym_event_share_visibility set not null,
  alter column post_share_visibility set default 'private'::public.share_visibility,
  alter column post_share_visibility set not null;
