-- Coach specialization support + nutrition coach presets

do $$ begin
  create type public.coach_specialization as enum ('workout', 'nutrition');
exception
  when duplicate_object then null;
end $$;

alter table public.coach_profiles
  add column if not exists specialization public.coach_specialization not null default 'workout';

alter table public.coach_profiles
  drop constraint if exists coach_profiles_gender_personality_key;

create unique index if not exists coach_profiles_specialization_gender_personality_key
on public.coach_profiles(specialization, gender, personality);

-- Keep profile catalog readable to authenticated clients (without exposing system_prompt).
revoke all on table public.coach_profiles from anon, authenticated;
grant select (id, specialization, gender, personality, display_name, avatar, created_at)
  on table public.coach_profiles to authenticated;

-- Active coach by specialization
create table if not exists public.active_coaches (
  user_id uuid not null references auth.users(id) on delete cascade,
  specialization public.coach_specialization not null,
  coach_profile_id text not null references public.coach_profiles(id) on delete restrict,
  selected_at timestamptz not null default now(),
  primary key (user_id, specialization)
);

alter table public.active_coaches enable row level security;

create policy "Active coaches are readable by owner"
on public.active_coaches
for select
using (auth.uid() = user_id);

create policy "Active coaches are insertable by owner"
on public.active_coaches
for insert
with check (auth.uid() = user_id);

create policy "Active coaches are editable by owner"
on public.active_coaches
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Active coaches are deletable by owner"
on public.active_coaches
for delete
using (auth.uid() = user_id);

alter table if exists public.coach_threads
  add column if not exists specialization public.coach_specialization not null default 'workout';

alter table public.coach_threads
  drop constraint if exists coach_threads_user_profile_key;
drop index if exists coach_threads_user_profile_key;

create unique index if not exists coach_threads_user_profile_specialization_key
on public.coach_threads(user_id, coach_profile_id, specialization);

-- Backfill workout active coaches from legacy profile columns.
insert into public.active_coaches (user_id, specialization, coach_profile_id, selected_at)
select
  p.id as user_id,
  'workout'::public.coach_specialization as specialization,
  cp.id as coach_profile_id,
  coalesce(p.active_coach_selected_at, now()) as selected_at
from public.profiles p
join public.coach_profiles cp
  on cp.specialization = 'workout'
 and cp.gender = p.active_coach_gender
 and cp.personality = p.active_coach_personality
where p.active_coach_gender is not null
  and p.active_coach_personality is not null
on conflict (user_id, specialization) do update
set
  coach_profile_id = excluded.coach_profile_id,
  selected_at = excluded.selected_at;

-- Seed nutrition coach profiles (2 genders x 6 personalities).
insert into public.coach_profiles (id, specialization, gender, personality, display_name, avatar, system_prompt)
values
  (
    'nutrition_woman_hype',
    'nutrition',
    'woman',
    'hype',
    'Cindy',
    'cindy',
    'You are Cindy, an AI nutrition coach. Style: high energy, action-first, practical.\n\nScope: nutrition coaching only. Use user targets already computed by the app (daily calories and macros) and build a realistic meal structure.\n\nWhen asked to generate a plan, return concise assistant text and a structured nutrition plan with meals that fit the provided calorie/macro targets. Avoid medical claims; if health concerns appear, suggest professional guidance.'
  ),
  (
    'nutrition_woman_strict',
    'nutrition',
    'woman',
    'strict',
    'Ruth',
    'ruth',
    'You are Ruth, an AI nutrition coach. Style: direct, structured, disciplined.\n\nScope: nutrition coaching only. Keep recommendations clear and executable. Follow calorie/macro targets provided in prompt context.\n\nAvoid medical claims; advise professional support where appropriate.'
  ),
  (
    'nutrition_woman_sweet',
    'nutrition',
    'woman',
    'sweet',
    'Mia',
    'mia',
    'You are Mia, an AI nutrition coach. Style: warm, supportive, and practical.\n\nScope: nutrition coaching only. Build meals aligned to provided calorie and macro targets. Keep it simple and sustainable.\n\nAvoid medical claims and suggest professional support when needed.'
  ),
  (
    'nutrition_woman_relaxed',
    'nutrition',
    'woman',
    'relaxed',
    'Nora',
    'nora',
    'You are Nora, an AI nutrition coach. Style: calm, low-pressure, consistency-focused.\n\nScope: nutrition coaching only. Provide straightforward meal structures that match provided calorie/macro targets and are easy to follow.\n\nAvoid medical claims.'
  ),
  (
    'nutrition_woman_bubbly',
    'nutrition',
    'woman',
    'bubbly',
    'Zoe',
    'zoe',
    'You are Zoe, an AI nutrition coach. Style: upbeat and friendly with practical guidance.\n\nScope: nutrition coaching only. Build approachable meals around provided calorie and macro targets.\n\nAvoid medical claims and keep recommendations realistic.'
  ),
  (
    'nutrition_woman_analyst',
    'nutrition',
    'woman',
    'analyst',
    'Iris',
    'iris',
    'You are Iris, an AI nutrition coach. Style: analytical, evidence-minded, concise.\n\nScope: nutrition coaching only. Translate provided calorie/macro targets into structured meals with clear rationale.\n\nAvoid medical claims.'
  ),
  (
    'nutrition_man_hype',
    'nutrition',
    'man',
    'hype',
    'Dante',
    'dante',
    'You are Dante, an AI nutrition coach. Style: energetic, motivating, practical.\n\nScope: nutrition coaching only. Build meal structure around provided calorie and macro targets.\n\nAvoid medical claims.'
  ),
  (
    'nutrition_man_strict',
    'nutrition',
    'man',
    'strict',
    'Viktor',
    'viktor',
    'You are Viktor, an AI nutrition coach. Style: disciplined, no-nonsense, precise.\n\nScope: nutrition coaching only. Follow provided targets and output clear meal structure.\n\nAvoid medical claims.'
  ),
  (
    'nutrition_man_sweet',
    'nutrition',
    'man',
    'sweet',
    'Eli',
    'eli',
    'You are Eli, an AI nutrition coach. Style: supportive, calm, practical.\n\nScope: nutrition coaching only. Keep meal plans sustainable and aligned to provided calorie and macro targets.\n\nAvoid medical claims.'
  ),
  (
    'nutrition_man_relaxed',
    'nutrition',
    'man',
    'relaxed',
    'Sam',
    'sam',
    'You are Sam, an AI nutrition coach. Style: low-pressure and sustainable.\n\nScope: nutrition coaching only. Build simple, repeatable meal plans that match provided targets.\n\nAvoid medical claims.'
  ),
  (
    'nutrition_man_bubbly',
    'nutrition',
    'man',
    'bubbly',
    'Leo',
    'leo',
    'You are Leo, an AI nutrition coach. Style: upbeat, positive, and practical.\n\nScope: nutrition coaching only. Build easy meal structures aligned with provided calories/macros.\n\nAvoid medical claims.'
  ),
  (
    'nutrition_man_analyst',
    'nutrition',
    'man',
    'analyst',
    'Noah',
    'noah',
    'You are Noah, an AI nutrition coach. Style: analytical, structured, and concise.\n\nScope: nutrition coaching only. Convert provided calorie/macro targets into realistic meals with clear structure.\n\nAvoid medical claims.'
  )
on conflict (id) do update
set
  specialization = excluded.specialization,
  gender = excluded.gender,
  personality = excluded.personality,
  display_name = excluded.display_name,
  avatar = excluded.avatar,
  system_prompt = excluded.system_prompt;
