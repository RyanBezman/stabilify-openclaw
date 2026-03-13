# Social Blocking Implementation

Last updated: 2026-03-12

## Goal

Add a first-class user blocking flow that is enforced in both the client relationship actions and Supabase read policies.

## Policy Rules

- Blocking is initiated from another user's profile.
- Blocking must sever direct follow and close-friend ties immediately.
- A blocked viewer must not be able to follow again or read the blocker's searchable social surfaces.
- A blocker must stop seeing the blocked user's feed posts and public progress surfaces until the block is removed.
- A blocker's Search results must also exclude users they have blocked.
- The blocker must have a settings-based unblock path that does not depend on rediscovering the blocked user in Search.
- Unblocking restores only a neutral relationship state; it does not recreate follow or close-friend links.

## Data Contracts

- Supabase RPCs:
  - `public.block_user(target_user_id uuid)` returns `blocked_user_id` and `status`.
  - `public.unblock_user(target_user_id uuid)` returns `unblocked_user_id` and `removed`.
- Helper function:
  - `public.has_user_blocked(blocker_user_id uuid, target_user_id uuid)` returns whether the blocker has an active `blocked` follow row.
- Block writes:
  - upsert `follows(follower_user_id=current_user, followed_user_id=target_user, status='blocked')`,
  - delete reverse `follows(target_user, current_user)`,
  - delete `close_friends` links in both directions.
- Read-policy enforcement:
  - `profile_directory` denies audience reads when the record owner has blocked `auth.uid()`,
  - `profiles`, `posts`, `weigh_ins`, `gym_sessions`, and `routines` deny audience reads when either side has an active block.
- Client data layer:
  - `lib/data/relationships.ts` owns `blockUser`, `unblockUser`, and reverse-block guarding inside `followUser`.
  - `lib/data/relationships.ts` also owns `fetchBlockedProfiles()` for the blocked-accounts manager.
  - `lib/data/userDirectory.ts` excludes current-user blocked ids from `searchUsersByUsernamePrefix()`.
  - `lib/features/shared/relationshipSyncEvents.ts` owns cross-surface relationship invalidation events:
    - `block_state_changed`,
    - `follow_state_changed`,
    - `close_friend_removed`.

## UX States

- `screens/UserProfile.tsx` shows:
  - primary/secondary follow CTA plus destructive `Block user` action when not blocked,
  - `Unblock user` CTA and `User blocked` locked-state messaging when blocked by the viewer.
- `screens/Feed.tsx` and profile-progress loaders must stop rendering the blocked user's posts/progress for the blocker while the block is active.
- `screens/SearchUsers.tsx` refreshes on focus and re-runs username search so a newly blocked user disappears when returning from their profile.
- `useFeed`, `useOwnProfileQuery`, and user/profile search flows subscribe to relationship sync events so block/unblock changes invalidate stale cached state without waiting for manual pull-to-refresh.
- `screens/BlockedAccounts.tsx` lists blocked users from Profile Settings and provides an in-app confirmation flow for unblocking.
- `useUserFollowActions` owns the confirmation-sheet copy and optimistic follow-state update for block/unblock transitions.
- Re-entering a blocked relationship keeps the follow button unavailable until the viewer explicitly unblocks.

## Analytics

- No analytics event changes are part of this implementation.

## QA

- Run `docs/qa/social-blocking-checklist.md`.
- Confirm the new migration is applied before client verification so RPC and RLS behavior match the app flow.
