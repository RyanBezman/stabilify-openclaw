create or replace function public.set_auto_support_enabled(enabled boolean)
returns table (
  auto_support_enabled boolean,
  changed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_enabled boolean := true;
  member_tier public.membership_tier := 'free';
  changed_value boolean := false;
begin
  if current_user_id is null then
    raise exception 'Missing user session.';
  end if;

  select
    coalesce(p.auto_support_enabled, true),
    coalesce(p.membership_tier, 'free'::public.membership_tier)
  into current_enabled, member_tier
  from public.profiles as p
  where p.id = current_user_id
  for update;

  if current_enabled is distinct from enabled then
    changed_value := true;
  end if;

  update public.profiles as p
  set auto_support_enabled = enabled,
      updated_at = now()
  where p.id = current_user_id;

  if changed_value then
    perform public.insert_support_automation_analytics_event(
      p_user_id := current_user_id,
      p_user_tier := member_tier,
      p_event_name := 'support_auto_post_setting_changed',
      p_trigger_reason := null,
      p_metadata := jsonb_build_object(
        'auto_support_enabled', enabled
      )
    );
  end if;

  return query
  select enabled, changed_value;
end;
$$;

create or replace function public.grant_auto_support_consent()
returns table (
  auto_support_consent_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  consented_at timestamptz;
begin
  if current_user_id is null then
    raise exception 'Missing user session.';
  end if;

  update public.profiles as p
  set
    auto_support_consent_at = coalesce(p.auto_support_consent_at, now()),
    updated_at = now()
  where p.id = current_user_id
  returning p.auto_support_consent_at into consented_at;

  return query
  select consented_at;
end;
$$;
