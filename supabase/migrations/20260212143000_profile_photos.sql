alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists avatar_updated_at timestamptz;

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do update
set public = excluded.public;

create policy "Profile photos are insertable by owner"
on storage.objects
for insert
with check (
  bucket_id = 'profile-photos'
  and auth.uid() = owner
);

create policy "Profile photos are readable by owner"
on storage.objects
for select
using (
  bucket_id = 'profile-photos'
  and auth.uid() = owner
);

create policy "Profile photos are updatable by owner"
on storage.objects
for update
using (
  bucket_id = 'profile-photos'
  and auth.uid() = owner
)
with check (
  bucket_id = 'profile-photos'
  and auth.uid() = owner
);

create policy "Profile photos are deletable by owner"
on storage.objects
for delete
using (
  bucket_id = 'profile-photos'
  and auth.uid() = owner
);
