create or replace function public.set_phone_nudges_enabled(
  p_enabled boolean
)
returns table (
  enabled boolean,
  changed boolean,
  active_device_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  changed_count integer := 0;
  active_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Missing user session.';
  end if;

  if p_enabled then
    select count(*)::integer
    into active_count
    from public.push_notification_devices as pnd
    where pnd.user_id = current_user_id
      and pnd.is_active = true;

    return query
    select (active_count > 0), false, active_count;
    return;
  end if;

  update public.push_notification_devices as pnd
  set
    is_active = false,
    last_error = null,
    updated_at = now()
  where pnd.user_id = current_user_id
    and pnd.is_active = true;

  get diagnostics changed_count = row_count;

  select count(*)::integer
  into active_count
  from public.push_notification_devices as pnd
  where pnd.user_id = current_user_id
    and pnd.is_active = true;

  return query
  select false, (changed_count > 0), active_count;
end;
$$;

revoke all on function public.set_phone_nudges_enabled(boolean) from public;
revoke all on function public.set_phone_nudges_enabled(boolean) from authenticated;
grant execute on function public.set_phone_nudges_enabled(boolean) to authenticated;
