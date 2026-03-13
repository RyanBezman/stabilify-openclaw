# Account Lifecycle QA Checklist

Last updated: 2026-03-13

## Goal

Validate account deletion request, recovery, hiding, and final purge behavior.

## Policy Rules

- Users get one settings action: `Delete account`.
- Deletion hides the account immediately and starts a `30 day` recovery window.
- Recovery is explicit and only available before the purge deadline.
- Final purge deletes coach chats and uploaded media as well as core account data.

## Data Contracts

- `request_account_deletion()` starts the lifecycle window.
- `restore_pending_account_deletion()` restores an in-window account.
- `profiles.account_status` is the canonical gate state.
- `supabase/functions/account-deletion` performs final purge.

## UX States

- Profile Settings shows a danger-zone delete action and destructive confirmation.
- Pending-deletion sign-ins land on the recovery screen.
- Recovery screen shows the purge deadline and offers restore/sign-out actions.

## Analytics

- No analytics validation is required for this checklist.

## QA

1. Open Profile Settings and confirm a `Delete account` row appears in a danger zone.
2. Tap `Delete account` and confirm the destructive confirmation explains immediate hiding, the `30 day` recovery window, and final purge scope.
3. Confirm deletion signs the user out and returns the app to guest auth.
4. From a second account, confirm the deleted-pending account no longer appears in Search, profile discovery, feed, or public progress surfaces.
5. Sign back in as the pending-deletion user before the deadline and confirm the recovery screen appears instead of the normal authenticated tabs.
6. Tap `Restore account` and confirm the user returns to the normal authenticated app with existing history intact.
7. Request deletion again, sign back in before the deadline, and confirm `Sign out` leaves the account pending deletion.
8. Seed a due `pending_deletion` account and run the purge function. Confirm the auth user is removed.
9. After purge, confirm rows tied to `auth.users(id)` are gone, including profile/accountability/social/coach data.
10. After purge, confirm the user's objects are removed from `profile-photos`, `post-photos`, and `gym-proofs`.
