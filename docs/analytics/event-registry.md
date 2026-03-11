# Stabilify Analytics Event Registry

## Scope

This registry is the source of truth for analytics events tracked from the mobile app and stored in `public.analytics_events`.

## Global Contract

- Event naming: `snake_case`.
- Source: mobile app + backend jobs/functions.
- Storage table: `public.analytics_events`.
- Required dimensions on every row:
  - `coach_persona`
  - `specialization`
  - `user_tier`

## Funnel Order

1. `checkin_opened`
2. `checkin_submitted`
3. `plan_review_opened`
4. `plan_decision_made` (conversion is `decision = 'accept'`)
5. `next_checkin_submitted`

## Event Definitions

### `checkin_opened`
- Status: `active`
- Added: `2026-03-02`
- Trigger points:
  - `screens/CoachCheckins.tsx` (`useEffect` when weekly check-in screen opens with resolved week)
- Required dimensions:
  - `coach_persona`
  - `specialization`
  - `user_tier`
- Optional fields:
  - `week_start`
  - `idempotency_key`
- Payload metadata keys:
  - `screen`: source screen name
- Notes:
  - Weekly idempotency key prevents duplicate opens for same coach + week.
  - Client tracking performs a duplicate lookup by `user_id + idempotency_key` before insert so repeated screen opens do not emit HTTP `409` errors in client sessions.

### `checkin_submitted`
- Status: `active`
- Added: `2026-03-02`
- Trigger points:
  - `lib/features/coaches/hooks/useCoachCheckins.ts` (`submitCheckin`)
- Required dimensions:
  - `coach_persona`
  - `specialization`
  - `user_tier`
- Optional fields:
  - `week_start`
  - `idempotency_key`
- Payload metadata keys:
  - `checkin_id`
  - `save_mode` (`create` | `update`)
  - `plan_updated_for_review` (`boolean`)
- Notes:
  - Writes after successful check-in submit workflow response.

### `plan_review_opened`
- Status: `active`
- Added: `2026-03-02`
- Trigger points:
  - `screens/CoachCheckins.tsx` (`onReviewUpdatedPlan` CTA handler)
- Required dimensions:
  - `coach_persona`
  - `specialization`
  - `user_tier`
- Optional fields:
  - `week_start`
  - `idempotency_key`
- Payload metadata keys:
  - `source`: navigation source for review action
- Notes:
  - Fired before navigating to `CoachWorkspace` plan review flow.
  - Client tracking performs a duplicate lookup by `user_id + idempotency_key` before insert so repeat opens for the same coach + week are silently ignored.

### `plan_decision_made`
- Status: `active`
- Added: `2026-03-02`
- Trigger points:
  - `lib/features/coaches/hooks/useCoachWorkspace.ts` (`logNutritionPlanFeedbackDecision`)
- Required dimensions:
  - `coach_persona`
  - `specialization`
  - `user_tier`
- Optional fields:
  - `week_start`
- Required event-specific fields:
  - `decision` (`accept` | `not_now` | `ask_coach`)
- Payload metadata keys:
  - `feedback_context`
- Notes:
  - Logged only after successful `plan_feedback_log` round trip.

### `next_checkin_submitted`
- Status: `active`
- Added: `2026-03-02`
- Trigger points:
  - `lib/features/coaches/services/funnelTracking.ts` (`trackCheckinSubmissionEvents`)
- Required dimensions:
  - `coach_persona`
  - `specialization`
  - `user_tier`
- Optional fields:
  - `week_start`
  - `idempotency_key`
- Payload metadata keys:
  - `checkin_id`
  - `accepted_feedback_id`
  - `accepted_feedback_week_start`
  - `accepted_feedback_created_at`
- Notes:
  - Emitted when a check-in is submitted and an accepted nutrition plan feedback row exists.
  - Idempotent per accepted feedback id (`next_checkin_submitted:<feedback_id>`).
  - Client tracking performs a duplicate lookup by `user_id + idempotency_key` before insert so duplicate submissions do not surface transport errors to the client.

### `gym_session_validation_requested`
- Status: `active`
- Added: `2026-03-02`
- Trigger points:
  - `supabase/migrations/20260302123000_gym_session_validation_phase2.sql` (`log_gym_session_validation_request_event` trigger function)
- Required dimensions:
  - `coach_persona`
  - `specialization`
  - `user_tier`
- Optional fields:
  - `session_id`
- Payload metadata keys:
  - `request_id`
  - `session_id`
  - `expires_at`
- Notes:
  - Emitted when requester creates a new close-friend validation request.
  - Uses system attribution dimensions (`coach_persona = accountability:system`, `specialization = workout`).

### `gym_session_validation_submitted`
- Status: `active`
- Added: `2026-03-02`
- Trigger points:
  - `supabase/migrations/20260302123000_gym_session_validation_phase2.sql` (`apply_gym_session_validation_vote` trigger function)
- Required dimensions:
  - `coach_persona`
  - `specialization`
  - `user_tier`
- Optional fields:
  - `session_id`
- Payload metadata keys:
  - `request_id`
  - `session_id`
  - `session_owner_user_id`
  - `decision` (`accept` | `decline`)
- Notes:
  - Emitted on successful close-friend vote insert.
  - One event per submitted vote.

### `gym_session_upgraded_verified`
- Status: `active`
- Added: `2026-03-02`
- Trigger points:
  - `supabase/migrations/20260302123000_gym_session_validation_phase2.sql` (`apply_gym_session_validation_vote` trigger function)
- Required dimensions:
  - `coach_persona`
  - `specialization`
  - `user_tier`
- Optional fields:
  - `session_id`
- Payload metadata keys:
  - `request_id`
  - `session_id`
  - `validator_user_id`
- Notes:
  - Emitted only when an `accept` vote performs `provisional -> verified` session upgrade.

### `gym_session_validation_expired`
- Status: `active`
- Added: `2026-03-02`
- Trigger points:
  - `supabase/migrations/20260302123000_gym_session_validation_phase2.sql` (`expire_gym_session_validation_requests` function)
- Required dimensions:
  - `coach_persona`
  - `specialization`
  - `user_tier`
- Optional fields:
  - `session_id`
- Payload metadata keys:
  - `request_id`
  - `session_id`
  - `expires_at`
  - `expire_reason` (`timeout` | `session_resolved` | `session_missing`)
- Notes:
  - Emitted when an open request is marked `expired`.
  - Expiry runs before requester/friend reads and vote submission flows.
  - Expiry also runs when linked sessions are no longer `provisional`, so stale requests are closed immediately.

## Support Automation Event Definitions

### `private_nudge_sent`
- Status: `active`
- Added: `2026-03-03`
- Trigger points:
  - `supabase/migrations/20260303100000_support_automation_phase1.sql` (`evaluate_support_for_due_users`)
- Required dimensions:
  - `coach_persona`
  - `specialization`
  - `user_tier`
- Payload metadata keys:
  - `trigger_reason`
  - `support_request_id`
  - `status`
- Notes:
  - Emitted once when weekly support request is created for a user.

### `private_nudge_opened`
- Status: `active`
- Added: `2026-03-03`
- Trigger points:
  - `supabase/migrations/20260303100000_support_automation_phase1.sql` (`mark_support_nudge_opened`)
- Required dimensions:
  - `coach_persona`
  - `specialization`
  - `user_tier`
- Payload metadata keys:
  - `trigger_reason`
  - `surface`
  - `support_request_id`
  - `status`
- Notes:
  - Emitted only on first open for each support request.

### `support_auto_post_published`
- Status: `active`
- Added: `2026-03-03`
- Trigger points:
  - `supabase/migrations/20260303100000_support_automation_phase1.sql` (`evaluate_support_for_due_users`)
- Required dimensions:
  - `coach_persona`
  - `specialization`
  - `user_tier`
- Payload metadata keys:
  - `trigger_reason`
  - `support_request_id`
  - `post_id`
- Notes:
  - Emitted only when evaluator publishes a close-friends post.

### `support_auto_post_suppressed_no_consent`
- Status: `active`
- Added: `2026-03-03`
- Trigger points:
  - `supabase/migrations/20260303100000_support_automation_phase1.sql` (`evaluate_support_for_due_users`)
- Required dimensions:
  - `coach_persona`
  - `specialization`
  - `user_tier`
- Payload metadata keys:
  - `trigger_reason`
  - `support_request_id`
- Notes:
  - Emitted when weekly support request is created without explicit consent.

### `support_auto_post_setting_changed`
- Status: `active`
- Added: `2026-03-03`
- Trigger points:
  - `supabase/migrations/20260303100000_support_automation_phase1.sql` (`set_auto_support_enabled`)
- Required dimensions:
  - `coach_persona`
  - `specialization`
  - `user_tier`
- Payload metadata keys:
  - `auto_support_enabled`
- Notes:
  - This event does not include a `trigger_reason` metadata key.

### `support_nudge_deferred`
- Status: `active`
- Added: `2026-03-03`
- Trigger points:
  - `supabase/migrations/20260303143000_support_nudge_deferred_analytics.sql` (`defer_support_nudge`)
- Required dimensions:
  - `coach_persona`
  - `specialization`
  - `user_tier`
- Payload metadata keys:
  - `trigger_reason`
  - `surface`
  - `support_request_id`
  - `status`
  - `deferred_until_local_date`
- Notes:
  - Emitted when user taps `Not now` on a suppressed support nudge.

## Table Contract Summary (`public.analytics_events`)

- Core columns:
  - `event_name`, `occurred_at`, `coach_persona`, `specialization`, `user_tier`
- Optional columns:
  - `decision`, `week_start`, `idempotency_key`, `platform`, `app_version`, `session_id`, `metadata`
- Guardrails:
  - `event_name` constrained to active registry events only
  - `decision` constrained to `accept|not_now|ask_coach`
  - `plan_decision_made` requires non-null `decision`

## Update Policy

When tracking changes:
1. Update this registry first.
2. Append `docs/analytics/tracking-changelog.md`.
3. Confirm code and SQL names still match this document.
