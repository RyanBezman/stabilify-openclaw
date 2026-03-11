# Gym Proof Status Migration QA

Last updated: 2026-03-10

## Goal

Validate that gym proof status + `status_reason` migration is correct across schema, save flow, Home UI, and log flow messaging.

## Policy Rules

- Allowed statuses are only `verified`, `partial`, `provisional`.
- Allowed status reasons are only:
  - `outside_radius`
  - `missing_photo`
  - `missing_location`
  - `missing_gym_setup`
  - `permission_denied`
  - `manual_override`
- Legacy status values must not appear after migration.
- Only `verified` sessions count toward weekly gym completion.

## Data Contracts

- DB enum `public.gym_session_status` contains:
  - `verified`
  - `partial`
  - `provisional`
- DB enum `public.gym_session_status_reason` contains:
  - `outside_radius`
  - `missing_photo`
  - `missing_location`
  - `missing_gym_setup`
  - `permission_denied`
  - `manual_override`
- `public.gym_sessions.status` default is `partial`.
- `public.gym_sessions.status_reason` is non-null for `partial`/`provisional`.
- App `GymSessionStatus` type matches enum labels exactly.
- App `GymSessionStatusReason` type matches enum labels exactly.
- Private storage bucket `gym-proofs` exists for gym proof uploads.

## UX States

- Home status chips render:
  - `Verified` (green),
  - `Partial` (amber),
  - `Provisional` (red).
- Home renders plain-English reason + next action guidance for non-verified sessions.
- Distance/away message and retry button only appear for `provisional`.
- "Verified today" lock state appears only for `verified`.
- Log session success modal shows reason + guidance when saved status is non-verified.
- Gym settings manual address flow only treats location as configured after a suggestion is selected from debounced geocode results.

## Analytics

- Ensure no regression to `gym_session_verified` event on verified saves.
- Ensure non-verified statuses do not create `gym_session_verified`.

## QA

1. Run migration on a DB containing old rows with `pending` and `rejected`.
2. Query `gym_sessions` and verify row statuses are now `partial` and `provisional`.
3. Query `gym_sessions` and verify:
   - `provisional` rows have `status_reason = outside_radius` when unknown,
   - `partial` rows have non-null best-known missing-signal reasons.
4. Log a location-matching session and confirm:
   - session status `verified`,
   - `status_reason` is `null`,
   - `gym_session_verified` event inserted.
5. Log a location-mismatched session and confirm:
   - session status `provisional`,
   - status reason copy says user is outside gym verification range,
   - no `gym_session_verified` event.
6. Confirm Home displays provisional status with retry action, reason guidance, and distance.
7. Trigger/save a non-verified session path and confirm log success modal shows reason + next action.
8. Confirm weekly completed count excludes `partial` and `provisional`.
9. In Gym settings, verify manual gym setup:
   - typing an address shows debounced suggestions,
   - selecting a suggestion sets the gym location for verification,
   - changing address text after selection requires re-selecting a suggestion before save.
10. On Home, tap `Add gym session` and confirm step 1 appears without auto-opening camera.
11. Confirm camera permission is only requested after tapping `Open camera`.
12. Confirm location permission is only requested after tapping `Tap to capture location`.
13. Deny or fail location capture and confirm the flow offers `Continue without location`.
14. Continue without location, save, and confirm the session is stored as `partial` with a non-null `status_reason`.
15. Confirm the inline gym flow shows 4 steps (take photo, verify location, confirm/save, analyzing) and card height stays constant across all states.
16. While inline gym flow/analyzing card is visible, confirm lower `Add gym session` row is hidden and `Log weight` row remains visible.
17. On a fresh database, log a session with a proof photo and confirm save does not fail with a storage bucket error.
18. Confirm the Home Progress card footer does not render a gym week label.
