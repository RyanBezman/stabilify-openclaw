create table if not exists public.coach_nutrition_plan_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.coach_threads(id) on delete cascade,
  week_start date not null,
  decision text not null,
  adherence_percent smallint,
  adherence_score smallint,
  context text not null default 'checkin_review',
  created_at timestamptz not null default now(),
  constraint coach_nutrition_plan_feedback_decision_check
    check (decision in ('accept', 'not_now', 'ask_coach')),
  constraint coach_nutrition_plan_feedback_context_check
    check (length(trim(context)) > 0),
  constraint coach_nutrition_plan_feedback_adherence_percent_check
    check (adherence_percent is null or (adherence_percent between 0 and 100)),
  constraint coach_nutrition_plan_feedback_adherence_score_check
    check (adherence_score is null or (adherence_score between 0 and 100))
);

create index if not exists coach_nutrition_plan_feedback_user_created_idx
on public.coach_nutrition_plan_feedback(user_id, created_at desc);

create index if not exists coach_nutrition_plan_feedback_user_week_idx
on public.coach_nutrition_plan_feedback(user_id, week_start desc);

alter table public.coach_nutrition_plan_feedback enable row level security;

create policy "Nutrition plan feedback is readable by owner"
on public.coach_nutrition_plan_feedback
for select
using (auth.uid() = user_id);

create policy "Nutrition plan feedback is insertable by owner"
on public.coach_nutrition_plan_feedback
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.coach_threads t
    where t.id = coach_nutrition_plan_feedback.thread_id
      and t.user_id = auth.uid()
      and t.specialization = 'nutrition'
  )
);
