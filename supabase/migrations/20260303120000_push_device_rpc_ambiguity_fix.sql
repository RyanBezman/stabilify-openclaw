create or replace function public.register_push_notification_device(
  p_expo_push_token text,
  p_platform text,
  p_app_version text
)
returns table (
  id uuid,
  expo_push_token text,
  is_active boolean,
  last_registered_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_expo_token text := trim(coalesce(p_expo_push_token, ''));
  normalized_platform text := trim(coalesce(p_platform, 'unknown'));
  normalized_app_version text := nullif(trim(coalesce(p_app_version, '')), '');
  row_out public.push_notification_devices%rowtype;
begin
  if current_user_id is null then
    raise exception 'Missing user session.';
  end if;

  if normalized_expo_token = '' then
    raise exception 'Push token is required.';
  end if;

  loop
    update public.push_notification_devices as pnd
    set
      platform = normalized_platform,
      app_version = normalized_app_version,
      is_active = true,
      last_registered_at = now(),
      last_error = null,
      updated_at = now()
    where pnd.user_id = current_user_id
      and pnd.expo_push_token = normalized_expo_token
    returning pnd.* into row_out;

    if row_out.id is not null then
      exit;
    end if;

    begin
      insert into public.push_notification_devices (
        user_id,
        expo_push_token,
        platform,
        app_version,
        is_active,
        last_registered_at,
        last_error
      )
      values (
        current_user_id,
        normalized_expo_token,
        normalized_platform,
        normalized_app_version,
        true,
        now(),
        null
      )
      returning * into row_out;

      exit;
    exception
      when unique_violation then
        -- Concurrent registration raced on (user_id, expo_push_token); retry update path.
        null;
    end;
  end loop;

  return query
  select row_out.id, row_out.expo_push_token, row_out.is_active, row_out.last_registered_at;
end;
$$;
