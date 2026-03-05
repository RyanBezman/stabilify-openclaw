do $$ begin
  create type public.membership_tier as enum ('free', 'pro');
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists membership_tier public.membership_tier;

update public.profiles
set membership_tier = coalesce(membership_tier, 'free'::public.membership_tier)
where membership_tier is null;

alter table public.profiles
  alter column membership_tier set default 'free'::public.membership_tier,
  alter column membership_tier set not null;
