alter table public.gym_session_validation_requests
  add column if not exists request_message text;

alter table public.gym_session_validation_requests
  drop constraint if exists gym_session_validation_requests_message_length_check;

alter table public.gym_session_validation_requests
  add constraint gym_session_validation_requests_message_length_check
  check (
    request_message is null
    or char_length(btrim(request_message)) <= 180
  );

create or replace function public.validate_gym_session_validation_request()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  session_row public.gym_sessions%rowtype;
  close_friend_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Missing user session.';
  end if;

  if new.requester_user_id <> auth.uid() then
    raise exception 'You can only create validation requests as yourself.';
  end if;

  perform public.expire_gym_session_validation_requests(new.session_id);

  select *
  into session_row
  from public.gym_sessions
  where id = new.session_id
  for update;

  if session_row.id is null then
    raise exception 'Gym session not found.';
  end if;

  if session_row.user_id <> new.requester_user_id then
    raise exception 'You can only request validation for your own session.';
  end if;

  if session_row.status <> 'provisional' then
    raise exception 'Only provisional sessions can be validated by close friends.';
  end if;

  if session_row.proof_path is null then
    raise exception 'A proof photo is required before requesting close-friend validation.';
  end if;

  select count(*)
  into close_friend_count
  from public.close_friends
  where user_id = new.requester_user_id;

  if close_friend_count <= 0 then
    raise exception 'Add at least one close friend before requesting validation.';
  end if;

  if exists (
    select 1
    from public.gym_session_validation_requests as req
    where req.session_id = new.session_id
      and req.status = 'open'
  ) then
    raise exception 'A validation request is already open for this session.';
  end if;

  new.request_message := nullif(btrim(new.request_message), '');
  if new.request_message is not null and char_length(new.request_message) > 180 then
    raise exception 'Validation request message must be 180 characters or fewer.';
  end if;

  new.status := 'open';
  if new.expires_at is null then
    new.expires_at := now() + interval '48 hours';
  elsif new.expires_at <= now() then
    raise exception 'Validation request expiry must be in the future.';
  end if;

  return new;
end;
$$;

drop policy if exists "Gym sessions are readable by validation friends" on public.gym_sessions;
create policy "Gym sessions are readable by validation friends"
on public.gym_sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.gym_session_validation_requests as req
    join public.close_friends as cf
      on cf.user_id = req.requester_user_id
     and cf.friend_user_id = auth.uid()
    where req.session_id = gym_sessions.id
      and req.status = 'open'
      and req.expires_at > now()
      and req.requester_user_id = gym_sessions.user_id
  )
);

drop policy if exists "Gym proofs are readable by validation friends" on storage.objects;
create policy "Gym proofs are readable by validation friends"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'gym-proofs'
  and exists (
    select 1
    from public.gym_session_validation_requests as req
    join public.gym_sessions as gs on gs.id = req.session_id
    join public.close_friends as cf
      on cf.user_id = req.requester_user_id
     and cf.friend_user_id = auth.uid()
    where req.status = 'open'
      and req.expires_at > now()
      and gs.proof_path = storage.objects.name
      and gs.user_id = req.requester_user_id
  )
);
