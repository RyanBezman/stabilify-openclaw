insert into storage.buckets (id, name, public)
values ('post-photos', 'post-photos', false)
on conflict (id) do update
set public = excluded.public;

create policy "Post photos are insertable by owner"
on storage.objects
for insert
with check (
  bucket_id = 'post-photos'
  and auth.uid() = owner
);

create policy "Post photos are readable by authenticated users"
on storage.objects
for select
using (
  bucket_id = 'post-photos'
  and auth.role() = 'authenticated'
);

create policy "Post photos are updatable by owner"
on storage.objects
for update
using (
  bucket_id = 'post-photos'
  and auth.uid() = owner
)
with check (
  bucket_id = 'post-photos'
  and auth.uid() = owner
);

create policy "Post photos are deletable by owner"
on storage.objects
for delete
using (
  bucket_id = 'post-photos'
  and auth.uid() = owner
);
