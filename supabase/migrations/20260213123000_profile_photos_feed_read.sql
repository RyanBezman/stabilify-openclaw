drop policy if exists "Profile photos are readable by owner" on storage.objects;
drop policy if exists "Profile photos read in own folder" on storage.objects;

create policy "Profile photos readable by authenticated users"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-photos'
);
