# Account Lifecycle Policy

Last updated: 2026-03-13

## Goal

Define user-facing account deletion, recovery, retention, and final purge behavior.

## Policy Rules

- Account lifecycle exposes one user-facing destructive option: `Delete account`.
- `Disable account` or `Deactivate account` is not a separate user-facing settings choice.
- Requesting deletion must hide the account immediately from product surfaces:
  - Search and profile discovery,
  - feed and public progress surfaces,
  - support automation and coach entry points.
- Deletion requests enter a recovery window of `30 days`.
- During the recovery window:
  - the auth account remains restorable,
  - the user may restore by signing back in and explicitly choosing restore,
  - the hidden account must not reappear publicly unless restored.
- After the recovery deadline, account deletion becomes permanent and must purge:
  - auth identity,
  - profile/accountability records,
  - social content and relationships,
  - coach chats, plans, check-ins, and related artifacts,
  - uploaded profile photos, post media, and gym proof media.
- Normal account deletion must not retain full account data indefinitely just in case.
- Exception handling:
  - an internal legal hold may delay final purge when specifically required,
  - legal hold is admin-only and not user-facing.
- AI coach chat policy:
  - coach chat history follows the same deletion lifecycle as the rest of the account by default,
  - if a concrete safety, abuse, billing, or legal incident requires preservation, apply legal hold before final purge.

## Data Contracts

- `public.profiles.account_status` is the canonical lifecycle state:
  - `active`
  - `pending_deletion`
- `public.profiles.deletion_requested_at` stores when the deletion window started.
- `public.profiles.scheduled_purge_at` stores the final purge deadline.
- `public.profiles.deletion_legal_hold_at` and `public.profiles.deletion_legal_hold_reason` reserve admin-only retention overrides.
- `public.profile_directory` must omit `pending_deletion` users.
- Public/audience read paths for profiles, posts, weigh-ins, gym sessions, and routines must exclude `pending_deletion` accounts.

## UX States

- Profile Settings includes a danger-zone `Delete account` action.
- Required deletion confirmation copy must communicate:
  - deletion hides the account immediately,
  - restore remains available for `30 days`,
  - final purge deletes accountability history, coach chats, and uploads after the deadline,
  - legal hold may delay final purge when required.
- A signed-in `pending_deletion` account lands on a recovery state instead of the normal authenticated app.
- Recovery state:
  - shows the scheduled purge deadline,
  - offers `Restore account`,
  - offers `Sign out` without reactivating the account.

## Analytics

- No analytics event names change in this rollout.

## QA

1. Confirm Profile Settings shows a `Delete account` danger-zone action.
2. Confirm requesting deletion hides the account from Search/feed/profile surfaces immediately.
3. Confirm signing back in during the recovery window lands on the recovery state instead of tabs.
4. Confirm restoring returns the user to the normal authenticated app with prior data intact.
5. Confirm due accounts are permanently purged, including uploaded media, when the purge worker runs after the deadline.
