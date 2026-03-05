create or replace function public.normalize_gym_proof_object_path(raw_path text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            replace(
              replace(
                split_part(trim(coalesce(raw_path, '')), '?', 1),
                '%2F',
                '/'
              ),
              '%2f',
              '/'
            ),
            '^https?://[^/]+/storage/v1/object/(?:public|sign|authenticated)/gym-proofs/',
            '',
            'i'
          ),
          '^/storage/v1/object/(?:public|sign|authenticated)/gym-proofs/',
          '',
          'i'
        ),
        '^/?gym-proofs/',
        '',
        'i'
      ),
      '^/+',
      ''
    ),
    ''
  );
$$;

with normalized as (
  select
    id,
    public.normalize_gym_proof_object_path(proof_path) as normalized_proof_path
  from public.gym_sessions
  where proof_path is not null
)
update public.gym_sessions as gs
set proof_path = normalized.normalized_proof_path
from normalized
where gs.id = normalized.id
  and normalized.normalized_proof_path is not null
  and gs.proof_path is distinct from normalized.normalized_proof_path;

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
      and gs.user_id = req.requester_user_id
      and public.normalize_gym_proof_object_path(gs.proof_path) = storage.objects.name
  )
);
