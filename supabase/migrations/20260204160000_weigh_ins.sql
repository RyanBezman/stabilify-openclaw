create table if not exists public.weigh_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight numeric(6,2) not null,
  unit public.weight_unit not null default 'lb',
  recorded_at timestamptz not null default now(),
  local_date date not null,
  timezone text not null,
  created_at timestamptz not null default now()
);

alter table public.weigh_ins
  add constraint weigh_ins_positive_weight_check
  check (weight > 0);

create unique index if not exists weigh_ins_user_local_date_key
on public.weigh_ins(user_id, local_date);

create index if not exists weigh_ins_user_recorded_at_idx
on public.weigh_ins(user_id, recorded_at desc);

alter table public.weigh_ins enable row level security;

create policy "Weigh-ins are readable by owner"
on public.weigh_ins
for select
using (auth.uid() = user_id);

create policy "Weigh-ins are insertable by owner"
on public.weigh_ins
for insert
with check (auth.uid() = user_id);

create policy "Weigh-ins are editable by owner"
on public.weigh_ins
for update
using (auth.uid() = user_id);
