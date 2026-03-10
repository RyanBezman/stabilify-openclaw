# Behind-Goal Support Automation Flow

Last updated: 2026-03-10

## Goal

Implement behind-goal support automation end-to-end with canonical trigger evaluation, consent gating, outcome persistence, in-app nudge states, and phone push delivery.

## Policy Rules

- Evaluate support logic once per user local day.
- Persist at most one support request per user per Monday-Sunday week.
- First qualifying trigger reason for a week is immutable for that week.
- Trigger reason priority:
  - `two_consecutive_missed_weeks`
  - `missed_weekly_target`
  - `miss_trajectory_3_days`
- Outcome resolution:
  - `disabled` when `auto_support_enabled = false` or close-friend count is `0`.
  - `suppressed_no_consent` when explicit consent is missing.
  - `published` when enabled + consented + close friends available.
- `Not now` on suppressed Home nudge snoozes the card until the next user local day.
- `Allow auto-support` writes enable + consent in one atomic RPC call.
- Consent granted after suppression does not backfill same-week posts.
- Push retry policy: first attempt + retries at `+10m` and `+20m`; third failure is terminal.

## Data Contracts

### Schema additions

- Profile fields:
  - `profiles.auto_support_enabled boolean not null default true`
  - `profiles.auto_support_consent_at timestamptz null`
- New enums:
  - `support_trigger_reason`
  - `support_request_status`
  - `support_nudge_surface`
  - `push_delivery_status`
- New tables:
  - `support_requests`
  - `push_notification_devices`
  - `support_nudge_push_deliveries`
  - `support_automation_state`
- `support_requests` also stores `nudge_deferred_until_local_date date` to persist local-day snooze state.

### RPCs / functions

- User-facing RPCs:
  - `fetch_current_week_support_request()`
  - `mark_support_nudge_opened(request_id uuid, surface support_nudge_surface)`
  - `defer_support_nudge(request_id uuid, surface support_nudge_surface)`
  - `allow_auto_support_with_consent()`
  - `set_auto_support_enabled(enabled boolean)`
  - `grant_auto_support_consent()`
  - `set_phone_nudges_enabled(enabled boolean)`
  - `register_push_notification_device(expo_push_token text, platform text, app_version text)`
- Backend functions:
  - `evaluate_support_for_due_users(run_at timestamptz default now())`
  - `claim_support_nudge_push_deliveries(limit_count integer default 100)`
  - `complete_support_nudge_push_delivery(delivery_id uuid, status push_delivery_status, error_message text default null)`
- Trigger helpers:
  - `compute_support_weekly_target_miss(...)`

### Trigger formulas

- `miss_trajectory_3_days`:
  - no gym session rows across last 3 local dates,
  - current week verified-gym count below weekly target.
- `missed_weekly_target`:
  - impossible weekly pacing (`verified + remaining_days < target`),
  - or end-of-week off-goal weekly average, with minimum 4 weigh-ins in each comparison week.
- `two_consecutive_missed_weeks`:
  - previous + current week both satisfy `missed_weekly_target`.

### Weekly average off-goal thresholds

- `maintain`: current week average outside `[target_min, target_max]`.
- `lose`: current week average >= previous week average + `2 lb` (or `0.9 kg`).
- `gain`: current week average <= previous week average - `3 lb` (or `1.36 kg`).

## UX States

### Home (`Today`)

- Render `SupportNudgeCard` when current-week support request exists.
- State copy/actions:
  - `suppressed_prompt`: consent CTA (`Allow auto-support`) + `Not now`.
  - `suppressed_acknowledged`: consent saved; no CTA repeat for same-week suppressed row.
  - `disabled`: re-enable CTA.
  - `published`: confirmation + recovery guidance.
- `Not now` updates server-side deferral and hides suppressed card until next local day.
- First card view calls `mark_support_nudge_opened(..., 'home')`.
- Consent copy contract:
  - title: `Allow private auto-support?`
  - disclosure: `When you're behind, Stabilify can post a private support request to your close friends. It won't share weight, photos, or location details.`
  - saved acknowledgement: `Private auto-support is on for future behind-goal triggers. This week's request stays suppressed and won't backfill.`

### Profile settings

- Expose `auto_support_enabled` switch.
- Auto support uses one switch with two-step `ON` flow:
  - every toggle to `ON` opens consent confirmation (including re-enabling after `OFF`),
  - agreeing calls `allow_auto_support_with_consent()` (atomic enable + consent write),
  - each accepted confirmation refreshes `auto_support_consent_at` to `now()`,
  - cancel keeps switch `OFF`.
- Profile settings uses the same consent-disclosure copy as the Home suppressed prompt so the promise is consistent across surfaces.
- Settings save never grants consent implicitly.
- Phone notifications are exposed as a settings switch.
- Turning phone notifications `OFF` deactivates active push-device rows via `set_phone_nudges_enabled(false)`.
- Setting save path uses server RPC to preserve analytics logging.

### Phone notifications

- Home nudge card keeps explicit `Enable phone notifications` action.
- Profile settings uses a phone-notifications switch.
- Turning phone notifications `ON` requests notification permission + Expo token and registers device via RPC.
- Turning phone notifications `OFF` deactivates active push-device rows for the signed-in user.

## Analytics

Implemented event names:

- `private_nudge_sent`
- `private_nudge_opened`
- `support_auto_post_published`
- `support_auto_post_suppressed_no_consent`
- `support_auto_post_setting_changed`
- `support_nudge_deferred`

Attribution defaults:

- `coach_persona = accountability:system`
- `specialization = workout`
- `user_tier = profiles.membership_tier`

## QA

1. Run evaluator twice same local day and confirm no duplicate weekly support requests.
2. Confirm one weekly support request per user/week, even if multiple triggers become true later.
3. Validate outcome mapping for:
   - enabled + consented + close friends,
   - enabled + no consent,
   - disabled toggle,
   - zero close friends.
4. Confirm `Allow auto-support` updates enable + consent atomically (no split-brain state).
5. Confirm no same-week post backfill after consent.
6. Confirm `suppressed_acknowledged` appears after successful same-week consent.
7. Confirm `Not now` hides suppressed nudge until next local day and then allows reappearance.
8. Confirm first Home view logs `private_nudge_opened` once.
9. Confirm device registration writes active push device row.
10. Confirm failed push attempts retry at +10m and +20m, then terminal failure.
11. Confirm invalid Expo token deactivates device row.
12. Confirm `Not now` emits `support_nudge_deferred` with surface + defer-date metadata.
13. Confirm analytics event names align with event registry exactly.
14. Confirm turning phone notifications off from Profile settings deactivates active push-device rows.
