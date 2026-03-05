drop policy if exists "Profile photos are insertable by owner" on storage.objects;
drop policy if exists "Profile photos are readable by owner" on storage.objects;
drop policy if exists "Profile photos are updatable by owner" on storage.objects;
drop policy if exists "Profile photos are deletable by owner" on storage.objects;

create policy "Profile photos insert in own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Profile photos read in own folder"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Profile photos update in own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Profile photos delete in own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
