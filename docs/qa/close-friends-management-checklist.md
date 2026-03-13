# Close Friends Management Checklist

## Goal

Verify that users can view and remove close friends from the app and that the removal takes effect immediately.

## Policy Rules

- Close-friend management is accessible from the Profile menu.
- Removal requires destructive confirmation.
- Removed users must stop counting as eligible close friends for future private support and validation flows.

## Data Contracts

- `fetchCloseFriendProfiles({ limit, cursor })` returns the rendered list.
- `removeCloseFriend(friendUserId)` deletes the owner's `close_friends` row.

## UX States

1. Open Profile, open the menu, and confirm a `Close Friends` destination exists.
2. Open Close Friends and verify:
   - loading copy appears while data is fetched,
   - current close friends render with avatar, display name, and username,
   - tapping `View profile` opens the selected user's profile.
3. Remove one close friend and verify:
   - confirmation sheet appears,
   - confirm action shows `Removing...`,
   - row disappears without leaving the screen,
   - reopening the screen keeps the removed user absent.
4. Cancel the removal alert and verify the row remains.
5. Seed an owner with zero close friends and verify the empty state copy renders.
6. After removal, confirm close-friend-dependent surfaces treat the user as removed:
   - support automation no longer considers them part of the owner's close-friend audience,
   - gym validation requests no longer treat them as an eligible close friend.
7. While other social surfaces are mounted, remove a close friend and confirm those surfaces refresh relationship-dependent state without requiring app restart.

## Analytics

- No analytics changes to validate for this flow.

## QA

- Re-run `docs/qa/support-automation-checklist.md` if close-friend membership is part of the scenario under test.
- Re-run `docs/qa/gym-session-validation-checklist.md` if the removed user previously had validation access.
