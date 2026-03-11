# Stabilify Analytics Tracking Changelog

Record every analytics add/change/remove here. Do not delete prior entries.

## 2026-03-10 - Coach funnel idempotent analytics writes avoid duplicate 409s

### Added
- Regression coverage for coach funnel analytics persistence:
  - idempotent events perform a duplicate lookup before insert
  - non-idempotent events still use plain `insert(...)`

### Changed
- Updated coach funnel analytics writes to check for an existing `user_id + idempotency_key` row before insert whenever an `idempotency_key` is present.
- This prevents repeated `checkin_opened`, `plan_review_opened`, and `next_checkin_submitted` writes from surfacing HTTP `409` conflicts in browser console logs during normal revisits.

### Removed
- None.

### Affected Files
- `lib/features/coaches/services/funnelTracking.ts`
- `lib/features/coaches/services/funnelTracking.test.ts`
- `docs/analytics/event-registry.md`
- `docs/analytics/tracking-changelog.md`

### SQL / DB Objects
- `public.analytics_events`
- unique index: `analytics_events_user_idempotency_key_uniq`

### Validation
- [x] Event registry updated.
- [x] Event names in docs match instrumentation code.
- [x] Required dimensions documented as mandatory.
- [x] Idempotent write behavior documented.

## 2026-03-04 - Gym validation stale-expiry instrumentation hardening

### Added
- `expire_reason` metadata on `gym_session_validation_expired`:
  - `timeout`
  - `session_resolved`
  - `session_missing`

### Changed
- `public.expire_gym_session_validation_requests(uuid)` now expires open requests for:
  - time-based expiry,
  - stale resolved sessions where linked session is no longer `provisional`.

### Removed
- None.

### Affected Files
- `supabase/migrations/20260304110000_gym_validation_expire_stale_resolved.sql`
- `docs/analytics/event-registry.md`
- `docs/analytics/tracking-changelog.md`

### SQL / DB Objects
- function: `public.expire_gym_session_validation_requests(uuid)`
- `public.analytics_events` payload metadata for `gym_session_validation_expired`
- `public.activity_events` payload metadata for `gym_session_validation_expired`

### Validation
- [x] Event registry updated.
- [x] Event names in docs match instrumentation code.
- [x] Required dimensions documented as mandatory.
- [x] New metadata keys documented.

## 2026-03-03 - Support nudge defer instrumentation

### Added
- `support_nudge_deferred` when a user taps `Not now` on a suppressed support nudge.

### Changed
- Expanded `public.analytics_events.event_name` check constraint to include `support_nudge_deferred`.
- Added defer instrumentation to `public.defer_support_nudge(...)` with surface + defer-date metadata.

### Removed
- None.

### Affected Files
- `supabase/migrations/20260303143000_support_nudge_deferred_analytics.sql`
- `docs/analytics/event-registry.md`
- `docs/analytics/tracking-changelog.md`

### SQL / DB Objects
- `public.analytics_events` (constraint: `analytics_events_event_name_check`)
- function: `public.defer_support_nudge(uuid, public.support_nudge_surface)`

### Validation
- [x] Event registry updated.
- [x] Event names in docs match instrumentation code.
- [x] Required dimensions documented as mandatory.
- [x] New metadata keys documented.

## 2026-03-03 - Behind-goal support automation instrumentation

### Added
- `private_nudge_sent` from backend support evaluator.
- `private_nudge_opened` from first in-app nudge open per support request.
- `support_auto_post_published` when close-friends support post publishes.
- `support_auto_post_suppressed_no_consent` when trigger hits with missing consent.
- `support_auto_post_setting_changed` when auto-support preference changes.

### Changed
- Expanded `public.analytics_events.event_name` check constraint for support automation events.
- Activated support-automation event definitions in the registry (moved from planned to active).
- Updated registry global source contract to reflect backend + mobile event producers.
- Clarified `support_auto_post_setting_changed` payload to only include `auto_support_enabled`.

### Removed
- None.

### Affected Files
- `supabase/migrations/20260303100000_support_automation_phase1.sql`
- `docs/analytics/event-registry.md`
- `docs/analytics/tracking-changelog.md`

### SQL / DB Objects
- `public.analytics_events` (constraint: `analytics_events_event_name_check`)
- `public.support_requests`
- function: `public.evaluate_support_for_due_users(timestamptz)`
- function: `public.mark_support_nudge_opened(uuid, public.support_nudge_surface)`
- function: `public.set_auto_support_enabled(boolean)`

### Validation
- [x] Event registry updated.
- [x] Event names in docs match instrumentation code.
- [x] Required dimensions documented as mandatory.
- [x] Support automation events marked active.

## 2026-03-02 - Gym session close-friend validation instrumentation

### Added
- `gym_session_validation_requested` on validation request creation.
- `gym_session_validation_submitted` on close-friend vote submission.
- `gym_session_upgraded_verified` on successful `provisional -> verified` upgrade.
- `gym_session_validation_expired` when open requests expire.

### Changed
- Expanded `public.analytics_events.event_name` check constraint to include gym validation event names.
- Activated previously planned gym validation analytics definitions in the registry.

### Removed
- None.

### Affected Files
- `supabase/migrations/20260302123000_gym_session_validation_phase2.sql`
- `docs/analytics/event-registry.md`
- `docs/analytics/tracking-changelog.md`

### SQL / DB Objects
- `public.analytics_events` (constraint: `analytics_events_event_name_check`)
- `public.gym_session_validation_requests`
- `public.gym_session_validation_votes`
- function: `public.expire_gym_session_validation_requests(uuid)`
- function: `public.log_gym_session_validation_request_event()`
- function: `public.apply_gym_session_validation_vote()`

### Validation
- [x] Event registry updated.
- [x] Event names in docs match instrumentation code.
- [x] Required dimensions documented as mandatory.
- [x] Planned gym-validation events moved to active instrumentation.

## 2026-03-02 - Support automation event planning (docs only)

### Added
- Planned (not yet instrumented) event specs:
  - `private_nudge_sent`
  - `private_nudge_opened`
  - `support_auto_post_published`
  - `support_auto_post_suppressed_no_consent`
  - `support_auto_post_setting_changed`
  - `gym_session_validation_submitted`
  - `gym_session_upgraded_verified`

### Changed
- Clarified registry distinction between `active` and `planned` events.

### Removed
- None.

### Affected Files
- `docs/analytics/event-registry.md`
- `docs/analytics/tracking-changelog.md`

### SQL / DB Objects
- None (documentation-only; no schema or constraint changes in this update).

### Validation
- [x] Event registry updated.
- [x] Event names in docs match current instrumentation for active events.
- [x] Required dimensions documented as mandatory.
- [x] Planned events marked as not yet instrumented.

## 2026-03-02 - Initial coach check-in funnel instrumentation

### Added
- `checkin_opened` tracking on weekly check-in screen open.
- `checkin_submitted` tracking on successful weekly check-in save/update.
- `plan_review_opened` tracking when user opens updated nutrition plan review.
- `plan_decision_made` tracking for nutrition feedback decisions (`accept`, `not_now`, `ask_coach`).
- `next_checkin_submitted` tracking after accepted plan decision and subsequent check-in submit.

### Changed
- Added analytics persistence schema in `public.analytics_events` with RLS, constraints, and indexes.

### Removed
- None.

### Affected Files
- `supabase/migrations/20260301120000_analytics_events.sql`
- `lib/features/coaches/services/funnelTracking.ts`
- `lib/features/coaches/hooks/useCoachCheckins.ts`
- `lib/features/coaches/hooks/useCoachWorkspace.ts`
- `screens/CoachCheckins.tsx`
- `screens/CoachWorkspace.tsx`
- `lib/features/coaches/types/screen.ts`
- `lib/features/coaches/index.ts`
- `docs/analytics/event-registry.md`

### SQL / DB Objects
- `public.analytics_events`
- index: `analytics_events_event_name_occurred_idx`
- index: `analytics_events_user_occurred_idx`
- index: `analytics_events_week_event_idx`
- index: `analytics_events_segment_idx`
- unique index: `analytics_events_user_idempotency_key_uniq`
- policy: `Analytics events are readable by owner`
- policy: `Analytics events are insertable by owner`

### Validation
- [x] Event registry updated.
- [x] Event names in docs match instrumentation code.
- [x] Required dimensions documented as mandatory.
- [x] Funnel order documented.

## Entry Template

Copy for future updates:

```md
## YYYY-MM-DD - Short change title

### Added
- ...

### Changed
- ...

### Removed
- ...

### Affected Files
- ...

### SQL / DB Objects
- ...

### Validation
- [ ] Event registry updated.
- [ ] Event names in docs match instrumentation code.
- [ ] Required dimensions documented as mandatory.
- [ ] Funnel order documented.
```
