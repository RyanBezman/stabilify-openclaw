create or replace function public.sync_profile_directory_from_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
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
