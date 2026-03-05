create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null,
  occurred_at timestamptz not null default now(),
  coach_persona text not null,
  specialization public.coach_specialization not null,
  user_tier public.membership_tier not null,
  decision text,
  week_start date,
  idempotency_key text,
  source text not null default 'mobile',
  platform text,
  app_version text,
  session_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_event_name_check
    check (
      event_name in (
        'checkin_opened',
        'checkin_submitted',
        'plan_review_opened',
        'plan_decision_made',
        'next_checkin_submitted'
      )
    ),
  constraint analytics_events_coach_persona_check
    check (length(trim(coach_persona)) > 0),
  constraint analytics_events_decision_check
    check (
      decision is null
      or decision in ('accept', 'not_now', 'ask_coach')
    ),
  constraint analytics_events_plan_decision_required_check
    check (
      (event_name = 'plan_decision_made' and decision is not null)
      or (event_name <> 'plan_decision_made')
    ),
  constraint analytics_events_idempotency_key_check
    check (
      idempotency_key is null
      or length(trim(idempotency_key)) > 0
    )
);

create index if not exists analytics_events_event_name_occurred_idx
on public.analytics_events(event_name, occurred_at desc);

create index if not exists analytics_events_user_occurred_idx
on public.analytics_events(user_id, occurred_at desc);

create index if not exists analytics_events_week_event_idx
on public.analytics_events(week_start, event_name, occurred_at desc);

create index if not exists analytics_events_segment_idx
on public.analytics_events(coach_persona, specialization, user_tier, occurred_at desc);

create unique index if not exists analytics_events_user_idempotency_key_uniq
on public.analytics_events(user_id, idempotency_key)
where idempotency_key is not null;

alter table public.analytics_events enable row level security;

create policy "Analytics events are readable by owner"
on public.analytics_events
for select
using (auth.uid() = user_id);

create policy "Analytics events are insertable by owner"
on public.analytics_events
for insert
with check (auth.uid() = user_id);
