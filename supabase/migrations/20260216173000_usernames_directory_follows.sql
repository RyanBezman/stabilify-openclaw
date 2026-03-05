alter table public.profiles
  add column if not exists username text;

-- Backfill deterministic usernames from existing username/display_name.
do $$
declare
  profile_row record;
  base_candidate text;
  candidate text;
  suffix integer;
begin
  for profile_row in
    select id, username, display_name
    from public.profiles
    order by created_at, id
  loop
    candidate := lower(
      regexp_replace(
        coalesce(nullif(trim(profile_row.username), ''), trim(profile_row.display_name), ''),
        '[^a-z0-9_]+',
        '',
        'g'
      )
    );

    if candidate = '' then
      candidate := 'user';
    end if;

    if char_length(candidate) < 3 then
      candidate := rpad(candidate, 3, '0');
    end if;

    candidate := substring(candidate from 1 for 20);
    base_candidate := candidate;
    suffix := 0;

    while exists (
      select 1
      from public.profiles as existing
      where existing.id <> profile_row.id
        and existing.username = candidate
    ) loop
      suffix := suffix + 1;
      candidate :=
        substring(base_candidate from 1 for greatest(1, 20 - char_length(suffix::text)))
        || suffix::text;
    end loop;

    update public.profiles
    set username = candidate
    where id = profile_row.id;
  end loop;
end $$;

alter table public.profiles
  drop constraint if exists profiles_username_format_check;

alter table public.profiles
  add constraint profiles_username_format_check
  check (username ~ '^[a-z0-9_]{3,20}$');

create unique index if not exists profiles_username_unique_idx
on public.profiles(lower(username));

alter table public.profiles
  alter column username set not null;

create table if not exists public.profile_directory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null,
  bio text not null default '',
  avatar_path text,
  account_visibility public.account_visibility not null default 'private'::public.account_visibility,
  progress_visibility public.account_visibility not null default 'public'::public.account_visibility,
  updated_at timestamptz not null default now()
);

create unique index if not exists profile_directory_username_unique_idx
on public.profile_directory(lower(username));

create index if not exists profile_directory_username_prefix_idx
on public.profile_directory (username text_pattern_ops);

create or replace function public.sync_profile_directory_from_profiles()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.profile_directory
    where user_id = old.id;
    return old;
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
after insert or update of username, display_name, bio, avatar_path, account_visibility, progress_visibility
on public.profiles
for each row
execute function public.sync_profile_directory_from_profiles();

drop trigger if exists profiles_sync_profile_directory_delete on public.profiles;
create trigger profiles_sync_profile_directory_delete
after delete on public.profiles
for each row
execute function public.sync_profile_directory_from_profiles();

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
on conflict (user_id)
do update set
  username = excluded.username,
  display_name = excluded.display_name,
  bio = excluded.bio,
  avatar_path = excluded.avatar_path,
  account_visibility = excluded.account_visibility,
  progress_visibility = excluded.progress_visibility,
  updated_at = now();

alter table public.profile_directory enable row level security;

drop policy if exists "Profile directory is readable by authenticated users" on public.profile_directory;
create policy "Profile directory is readable by authenticated users"
on public.profile_directory
for select
to authenticated
using (true);

grant select on table public.profile_directory to authenticated;

drop policy if exists "Follows are readable by participants" on public.follows;
drop policy if exists "Accepted follows are readable by authenticated users" on public.follows;

create policy "Follows are readable by participants"
on public.follows
for select
to authenticated
using (auth.uid() = follower_user_id or auth.uid() = followed_user_id);

create policy "Accepted follows are readable by authenticated users"
on public.follows
for select
to authenticated
using (status = 'accepted'::public.follow_status);

drop policy if exists "Weigh-ins are readable by progress audience" on public.weigh_ins;
create policy "Weigh-ins are readable by progress audience"
on public.weigh_ins
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.profiles as p
    where p.id = weigh_ins.user_id
      and p.account_visibility = 'public'::public.account_visibility
      and p.progress_visibility = 'public'::public.account_visibility
  )
);

drop policy if exists "Gym sessions are readable by progress audience" on public.gym_sessions;
create policy "Gym sessions are readable by progress audience"
on public.gym_sessions
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.profiles as p
    where p.id = gym_sessions.user_id
      and p.account_visibility = 'public'::public.account_visibility
      and p.progress_visibility = 'public'::public.account_visibility
  )
);

drop policy if exists "Routines are readable by progress audience" on public.routines;
create policy "Routines are readable by progress audience"
on public.routines
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.profiles as p
    where p.id = routines.user_id
      and p.account_visibility = 'public'::public.account_visibility
      and p.progress_visibility = 'public'::public.account_visibility
  )
);
