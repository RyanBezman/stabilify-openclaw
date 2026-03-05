-- Add bio column to profiles
alter table profiles add column if not exists bio text default '' not null;
