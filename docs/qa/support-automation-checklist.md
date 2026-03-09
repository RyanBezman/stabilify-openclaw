# Support Automation QA Checklist

Last updated: 2026-03-03

## Goal

Verify behind-goal support automation trigger evaluation, consent gating, outcome persistence, in-app nudge behavior, push dispatch retries, and analytics instrumentation.

## Policy Rules

- One support request max per user per Monday-Sunday week.
- Trigger priority:
  - `two_consecutive_missed_weeks` > `missed_weekly_target` > `miss_trajectory_3_days`.
- Outcome mapping:
  - `published`,
  - `suppressed_no_consent`,
  - `disabled`.
- Consent after suppression does not backfill same-week post.

## Data Contracts

- `profiles.auto_support_enabled` defaults true.
- `profiles.auto_support_consent_at` is null until explicit user consent.
- `support_requests` unique key: `(user_id, week_start)`.
- `support_nudge_push_deliveries` retries use pending queue semantics.
- Push device registration stored in `push_notification_devices` with `is_active` toggle.

## UX States

- Home card renders when current-week support request exists.
- `suppressed_prompt` state shows consent CTA + `Not now`.
- `suppressed_acknowledged` state confirms consent saved for future triggers (no same-week backfill).
- `disabled` state shows re-enable CTA.
- `published` state shows confirmation guidance.
- Home nudge card supports explicit `Enable phone notifications` flow.
- Profile settings support card exposes phone notifications as a toggle.
- Profile settings auto-support flow uses one switch and consent confirmation every time toggling `ON`.

## Analytics

Validate events:

- `private_nudge_sent`
- `private_nudge_opened`
- `support_auto_post_published`
- `support_auto_post_suppressed_no_consent`
- `support_auto_post_setting_changed`
- `support_nudge_deferred`

## QA

1. Seed user with weekly target miss and no close friends; run evaluator; confirm `disabled` outcome.
2. Seed user with close friends + no consent; run evaluator; confirm `suppressed_no_consent`.
3. Seed user with close friends + consent + enabled; run evaluator; confirm `published` + post row.
4. Re-run evaluator in same week and confirm no second `support_requests` row.
5. Toggle auto-support in profile settings and confirm setting persists + event logged.
6. Tap `Allow auto-support` in Home suppressed state and confirm enable + consent persist atomically.
7. Confirm same-week suppressed row remains suppressed after consent (no backfill post) and card shows acknowledged state.
8. Tap `Not now` in Home suppressed state and confirm card hides until next local day.
9. After local-day rollover, confirm same-week suppressed nudge can reappear.
10. In Profile settings, toggling Auto support `ON` must show explicit consent confirmation; cancel keeps it off.
11. In Profile settings, toggle Auto support `OFF` then back `ON`, tap agree, and confirm `profiles.auto_support_consent_at` updates to a newer timestamp.
12. Toggle Phone notifications `ON` in Profile settings and confirm push token registration row is active.
13. Toggle Phone notifications `OFF` in Profile settings and confirm active push device rows become inactive.
14. Create queued push deliveries and run dispatch function:
   - successful send marks `sent`,
   - failed send schedules retries,
   - third failure marks terminal `failed`.
15. Simulate `DeviceNotRegistered` Expo error and confirm matching device row becomes inactive.
16. Tap `Not now` on suppressed nudge and verify one `support_nudge_deferred` row with `surface` + `deferred_until_local_date`.
17. Open Home nudge card first time and verify one `private_nudge_opened` row only.
18. Run `npm test` and `npm run lint:arch`.
