insert into storage.buckets (id, name, public)
values ('gym-proofs', 'gym-proofs', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Gym proofs are deletable by owner" on storage.objects;
create policy "Gym proofs are deletable by owner"
on storage.objects
for delete
using (
  bucket_id = 'gym-proofs'
  and auth.uid() = owner
);
