# Apple Health Steps Integration

Last updated: 2026-03-12

## Goal

Allow users to opt into Apple Health step tracking from Profile Settings, then show step progress in `AuthedHome` alongside weigh-ins and gym sessions.

## Policy Rules

- Step tracking is opt-in and defaults to off.
- Step access is requested when the user enables the `Track steps` setting.
- `Track steps` remains iPhone-only (Apple Health / HealthKit).
- When disabled, Home does not attempt Apple Health reads and the steps ring remains in the `Off` state.
- Daily step goal is user-editable in Profile Settings and defaults to `10,000`.
- In Home progress:
  - `7 days` continues to show today's live steps.
  - Longer filters (`1 month`, `3 months`, `6 months`) show average daily steps for the selected window.

## Data Contracts

- `public.profiles`
  - new column: `apple_health_steps_enabled boolean not null default false`
  - new column: `daily_step_goal integer not null default 10000`
- Profile settings read/write contracts:
  - `fetchProfileSettingsValues` returns `appleHealthStepsEnabled`
  - `fetchProfileSettingsValues` returns `dailyStepGoal`
  - `saveProfileSettingsValues` upserts `apple_health_steps_enabled`
  - `saveProfileSettingsValues` upserts `daily_step_goal`
- Dashboard contract:
  - `fetchDashboardData` returns `profile.appleHealthStepsEnabled`
  - `fetchDashboardData` returns `profile.dailyStepGoal`
- Device data contract:
  - `lib/data/appleHealth.ts` encapsulates HealthKit availability, permission initialization, and `getStepCount` reads for today's total.
  - `lib/data/appleHealth.ts` also reads daily historical step samples to compute average daily steps for non-default Home filters.

## UX States

- Profile Settings (`ProfileSettings`):
  - Toggle: `Track steps`
  - On enable:
    - requests Apple Health read access for steps
    - on success, toggle stays on
    - on failure, toggle stays off and error alert is shown
  - Step goal control:
    - quick picks: `6k`, `8k`, `10k`, `12k`
    - numeric input accepts a custom goal and persists it to `profiles.daily_step_goal`
  - On non-iOS devices:
    - helper copy indicates iPhone-only support
    - toggle is disabled
- Home (`ProgressOverviewCard`):
  - Third ring: `Steps`
  - States:
    - `Off` with `Enable` when tracking disabled; tapping navigates to Profile Settings
    - `...` while reading steps
    - `—` when enabled but no readable value
    - `7 days`: compact count (for example `8.4k`) for today's steps with progress vs the saved goal
    - longer filters: compact count for average daily steps across the selected window, with the ring still compared against the saved daily goal
  - Default target for ring progress: `10,000` daily steps until the user changes it.

## Analytics

- No new analytics events are added in this change.

## QA

1. On iPhone build (custom dev client/EAS), open Profile Settings and enable `Track steps`.
2. Confirm iOS Health permission prompt appears and enabling succeeds.
3. Navigate to Home and confirm `Progress` shows a third `Steps` ring.
4. Leave Home on the default `7 days` filter and confirm the Steps ring updates from loading state to today's step value.
5. Open the time range menu, switch Home to `3 months`, and confirm the Steps ring changes to average daily steps for that selected window.
6. Disable `Track steps` and confirm Home ring shows `Off` with `Tap to enable`, and tapping opens Profile Settings.
7. Change the daily step goal in Profile Settings, save, then return Home and confirm the Steps ring progress reflects the saved target.
8. On Android, confirm `Track steps` shows iPhone-only copy and toggle is disabled.
