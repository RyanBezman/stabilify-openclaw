create policy "Gym proofs are insertable by owner"
on storage.objects
for insert
with check (
  bucket_id = 'gym-proofs'
  and auth.uid() = owner
);

create policy "Gym proofs are readable by owner"
on storage.objects
for select
using (
  bucket_id = 'gym-proofs'
  and auth.uid() = owner
);

create policy "Gym proofs are updatable by owner"
on storage.objects
for update
using (
  bucket_id = 'gym-proofs'
  and auth.uid() = owner
)
with check (
  bucket_id = 'gym-proofs'
  and auth.uid() = owner
);
