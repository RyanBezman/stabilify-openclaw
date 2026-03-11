# Gym Proof Status Migration

Last updated: 2026-03-10

## Goal

Align gym proof state contracts across database, runtime types, and UI with policy statuses (`verified`, `partial`, `provisional`) plus canonical `status_reason` values.

## Policy Rules

- Canonical gym proof statuses are:
  - `verified`
  - `partial`
  - `provisional`
- Canonical gym proof status reasons are:
  - `outside_radius`
  - `missing_photo`
  - `missing_location`
  - `missing_gym_setup`
  - `permission_denied`
  - `manual_override`
- Legacy mappings must be preserved during migration:
  - `pending -> partial`
  - `rejected -> provisional`
- Weekly progress and streak scoring continue to count only `verified` sessions.

## Data Contracts

- TypeScript contracts:
  - `GymSessionStatus = "verified" | "partial" | "provisional"`
  - `GymSessionStatusReason = "outside_radius" | "missing_photo" | "missing_location" | "missing_gym_setup" | "permission_denied" | "manual_override"`
- Save flow mapping:
  - default/fallback status is `partial`,
  - location match inside gym radius => `verified`,
  - location mismatch with proof captured => `provisional`,
  - `provisional` always writes `status_reason = outside_radius`,
  - `partial` always writes a missing-signal reason.
- Database migration:
  - rename enum labels on `public.gym_session_status`:
    - `pending` to `partial`,
    - `rejected` to `provisional`,
  - set `public.gym_sessions.status` default to `partial`.
  - add enum `public.gym_session_status_reason`,
  - add `public.gym_sessions.status_reason`,
  - backfill:
    - `provisional` rows => `outside_radius` when unknown,
    - `partial` rows => best-known missing-signal reason,
  - enforce check:
    - `partial` / `provisional` require non-null `status_reason`,
    - `verified` allows `null` (or `manual_override` for explicit admin overrides).

## UX States

- Home gym progress badge/status text reflects:
  - `Verified`
  - `Partial`
  - `Provisional`
- Home gym progress card shows reason text + next action guidance for non-verified sessions.
- Log gym session success modal shows reason text + next action guidance for non-verified saves.
- Retry CTA is shown for `provisional` sessions (location mismatch) to encourage a fresh verified log.
- Weekly progress card still shows "Verified sessions only" so scoring expectations are unchanged.
- Gym settings manual fallback requires selecting a geocoded address suggestion before location verification is considered configured (name-only/manual text is not sufficient).

## Analytics

- No event name changes in this migration.
- `gym_session_verified` behavior remains unchanged.

## QA

1. Apply migrations on an existing DB with legacy gym rows and verify:
   - previous `pending` rows read back as `partial`,
   - previous `rejected` rows read back as `provisional`.
2. Log a session with valid gym location and confirm status `verified`.
3. Log a session with location outside radius and confirm:
   - status `provisional`,
   - `status_reason = outside_radius`,
   - reason + next-action guidance rendered on Home.
4. Log a session with a proof photo, deny or fail location capture in the inline flow, continue without location, and confirm:
   - fallback status `partial`,
   - non-null `status_reason` with best-known missing-signal mapping.
5. Confirm log flow success messaging shows reason + guidance when status is non-verified.
6. Confirm weekly gym completion/streak still counts only `verified` sessions.
7. In Gym settings, enter a manual gym name + address and confirm:
   - address suggestions appear after debounced typing,
   - selecting a suggestion sets location coordinates,
   - editing the address text after selection clears the selected geocode until a new suggestion is chosen.
