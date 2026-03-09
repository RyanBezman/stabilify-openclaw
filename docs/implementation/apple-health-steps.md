# Apple Health Steps Integration

Last updated: 2026-03-09

## Goal

Allow users to opt into Apple Health step tracking from Profile Settings, then show today's step progress in `AuthedHome` alongside weigh-ins and gym sessions.

## Policy Rules

- Step tracking is opt-in and defaults to off.
- Step access is requested when the user enables the `Track steps` setting.
- `Track steps` remains iPhone-only (Apple Health / HealthKit).
- When disabled, Home does not attempt Apple Health reads and the steps ring remains in the `Off` state.

## Data Contracts

- `public.profiles`
  - new column: `apple_health_steps_enabled boolean not null default false`
- Profile settings read/write contracts:
  - `fetchProfileSettingsValues` returns `appleHealthStepsEnabled`
  - `saveProfileSettingsValues` upserts `apple_health_steps_enabled`
- Dashboard contract:
  - `fetchDashboardData` returns `profile.appleHealthStepsEnabled`
- Device data contract:
  - `lib/data/appleHealth.ts` encapsulates HealthKit availability, permission initialization, and `getStepCount` reads for today's total.

## UX States

- Profile Settings (`ProfileSettings`):
  - Toggle: `Track steps`
  - On enable:
    - requests Apple Health read access for steps
    - on success, toggle stays on
    - on failure, toggle stays off and error alert is shown
  - On non-iOS devices:
    - helper copy indicates iPhone-only support
    - toggle is disabled
- Home (`ProgressOverviewCard`):
  - Third ring: `Steps`
  - States:
    - `Off` when tracking disabled
    - `...` while reading steps
    - `—` when enabled but no readable value
    - compact count (for example `8.4k`) with progress vs target when available
  - Default target for ring progress: `10,000` daily steps.

## Analytics

- No new analytics events are added in this change.

## QA

1. On iPhone build (custom dev client/EAS), open Profile Settings and enable `Track steps`.
2. Confirm iOS Health permission prompt appears and enabling succeeds.
3. Navigate to Home and confirm `Progress` shows a third `Steps` ring.
4. Confirm ring updates from loading state to today's step value.
5. Disable `Track steps` and confirm Home ring shows `Off`.
6. On Android, confirm `Track steps` shows iPhone-only copy and toggle is disabled.
