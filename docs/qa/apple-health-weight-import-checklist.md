# Apple Health Weight Import QA Checklist

Last updated: 2026-03-10

## Goal

Validate explicit Apple Health weight import into the `Log weigh-in` draft on iPhone.

## Policy Rules

- Apple Health weight import is iPhone-only.
- Importing fills the draft but does not save automatically.
- Imported samples use the normal weigh-in save path after user confirmation.

## Data Contracts

- `fetchAppleHealthLatestWeight` returns the latest Apple Health weight in the user's preferred unit plus the sample timestamp.
- `saveWeighIn` remains the only write path into `weigh_ins`.

## UX States

- `Log weigh-in` shows an Apple Health import row on iPhone only.
- Successful imports update both the weight input and the selected date/time.
- Failed imports show inline error text and a permission-recovery alert.

## Analytics

- No analytics validation is required for this checklist.

## QA

1. On an iPhone build, open `Log weigh-in`.
2. Confirm the `Apple Health` section appears under the weight input with an `Import latest` action.
3. Tap `Import latest` and allow Apple Health weight access.
4. Confirm the button shows `Importing...` while the request is in flight.
5. Confirm the imported weight value populates the input using the profile's preferred unit.
6. Confirm the selected date and time update to the HealthKit sample timestamp.
7. Confirm helper text shows the imported sample timestamp after success.
8. Tap `Save` and confirm the weigh-in saves successfully.
9. Re-open `Log weigh-in` and confirm the saved value appears in the `Last:` helper.
10. On Android, confirm the Apple Health import section does not appear.
11. On iPhone after revoking Health permission in Settings, tap `Import latest` and confirm inline error text plus the failure alert are shown.
12. Return to Home after saving the imported weigh-in and confirm the profile summary now shows `Latest weigh-in` with the newly saved value.
