# Apple Health Weight Import

Last updated: 2026-03-10

## Goal

Allow iPhone users to pull their latest Apple Health weight sample into the `Log weigh-in` draft, then save it into Stabilify's existing `weigh_ins` flow.

## Policy Rules

- Apple Health weight import is iPhone-only.
- Weight import is user-initiated from `Log weigh-in`; it does not silently sync in the background.
- Importing from Apple Health fills the draft weight and timestamp, but the user must still tap `Save`.
- Saving an imported Apple Health sample follows the normal weigh-in rule: saving again for the same local date replaces the previous entry.

## Data Contracts

- `lib/data/appleHealth.ts`
  - adds `requestAppleHealthWeightReadAccess`
  - adds `fetchAppleHealthLatestWeight(unit)`
  - requests HealthKit `Weight` read permission
- `lib/features/log-weigh-in/useLogWeighIn.ts`
  - adds Apple Health import state for loading, error, and imported sample timestamp
  - exposes `importAppleHealthWeight()` to populate the draft with the latest HealthKit sample
- `screens/LogWeighIn.tsx`
  - adds an `Apple Health` import panel inside the `Weight` card on iPhone

## UX States

- `Log weigh-in` on iPhone:
  - shows `Apple Health` helper copy and `Import latest` action
  - while reading HealthKit, button shows `Importing...`
  - on success, weight input and date/time controls update to the imported sample
  - imported sample helper text shows the source timestamp
  - on failure, the screen shows inline error copy and an alert with `Open Settings`
- `Log weigh-in` on Android:
  - no Apple Health import affordance is shown

## Analytics

- No analytics events are added in this change.

## QA

1. On an iPhone build, open `Log weigh-in`.
2. Tap `Import latest` in the Apple Health section and accept Health permission if prompted.
3. Confirm the weight input updates to the latest Apple Health weight.
4. Confirm the date and time update to the Apple Health sample timestamp.
5. Confirm the imported-sample helper text appears under the Apple Health section.
6. Tap `Save` and confirm the weigh-in saves successfully.
7. Re-open `Log weigh-in` and confirm the saved value now appears as the latest weigh-in.
8. Deny Apple Health weight access in iOS settings, tap `Import latest` again, and confirm inline error copy plus the failure alert are shown.
