create or replace function public.allow_auto_support_with_consent()
returns table (
  auto_support_enabled boolean,
  auto_support_consent_at timestamptz,
  changed_enabled boolean,
  changed_consent boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_enabled boolean := true;
  current_consent_at timestamptz := null;
  member_tier public.membership_tier := 'free';
  next_consent_at timestamptz := now();
begin
  if current_user_id is null then
    raise exception 'Missing user session.';
  end if;

  select
    coalesce(p.auto_support_enabled, true),
    p.auto_support_consent_at,
    coalesce(p.membership_tier, 'free'::public.membership_tier)
  into current_enabled, current_consent_at, member_tier
  from public.profiles as p
  where p.id = current_user_id
  for update;

  if not found then
    raise exception 'Profile not found.';
  end if;

  next_consent_at := now();

  update public.profiles as p
  set
    auto_support_enabled = true,
    auto_support_consent_at = next_consent_at,
    updated_at = now()
  where p.id = current_user_id;

  if current_enabled is distinct from true then
    perform public.insert_support_automation_analytics_event(
      p_user_id := current_user_id,
      p_user_tier := member_tier,
      p_event_name := 'support_auto_post_setting_changed',
      p_trigger_reason := null,
      p_metadata := jsonb_build_object(
        'auto_support_enabled', true
      )
    );
  end if;

  return query
  select
    true,
    next_consent_at,
    (current_enabled is distinct from true),
    (current_consent_at is distinct from next_consent_at);
end;
$$;

revoke all on function public.allow_auto_support_with_consent() from public;
revoke all on function public.allow_auto_support_with_consent() from authenticated;
grant execute on function public.allow_auto_support_with_consent() to authenticated;
