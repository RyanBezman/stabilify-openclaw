# Close Friends Management

Last updated: 2026-03-12

## Goal

Provide an in-app destination where users can review and remove close-friend relationships.

## Policy Rules

- Close-friend management is owned by the current user from the Profile menu.
- Removal is a destructive action and must require confirmation.
- Removing a close friend must take effect immediately for future support-post delivery and gym validation eligibility.

## Data Contracts

- Data APIs in `lib/data/relationships.ts`:
  - `fetchCloseFriends({ userId?, limit?, cursor? })`
  - `fetchCloseFriendProfiles({ userId?, limit?, cursor? })`
  - `removeCloseFriend(friendUserId)`
- `fetchCloseFriendProfiles(...)` enriches `close_friends` rows with:
  - `displayName`
  - `username`
  - `bio`
  - `avatarPath`
- Writes still target `public.close_friends` and rely on existing owner-delete RLS.
- Relationship invalidation:
  - successful removals publish `close_friend_removed` through `lib/features/shared/relationshipSyncEvents.ts`,
  - subscribers can refresh dependent surfaces without waiting for manual navigation refresh.

## UX States

- Profile menu includes a `Close Friends` row.
- `screens/CloseFriends.tsx` shows:
  - loading state,
  - empty state when no close friends exist,
  - list rows with avatar, identity, optional bio, `View profile`, and `Remove`.
- Removing a row:
  - opens destructive confirmation sheet,
  - shows in-flight `Removing...` state,
  - removes the row from the visible list on success,
  - shows an error alert on failure.

## Analytics

- No analytics event changes are part of this implementation.

## QA

- Run `docs/qa/close-friends-management-checklist.md`.
- Confirm existing close-friend-dependent flows respect the updated list after removal.
