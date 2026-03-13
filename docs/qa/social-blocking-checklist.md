# Social Blocking Checklist

Last updated: 2026-03-12

## Scope

Verify user blocking and unblocking across profile actions and Supabase-enforced visibility.

## Preconditions

1. Apply migrations through `20260312163001_social_blocking_blocker_visibility.sql`.
2. Prepare two accounts:
   - `blocker`
   - `target`
3. Give `target` a discoverable profile with at least one post.

## Profile Action Flow

1. Sign in as `blocker`.
2. Open `target`'s profile.
3. Confirm the screen shows `Follow` (or `Following` / `Requested`) and `Block user`.
4. Tap `Block user` and confirm the destructive confirmation sheet.
5. Confirm the screen switches to `User blocked` with an `Unblock user` CTA.
6. If `blocker` had been following `target`, confirm the visible follower count decreases by one.
7. If `target` had been following `blocker`, confirm the visible following count also updates on the same profile without leaving the screen.

## Relationship Cleanup

1. Before blocking, create each of these if possible:
   - `target -> blocker` follow
   - `blocker -> target` follow
   - close-friend links in both directions
2. Block `target` as `blocker`.
3. Verify in Supabase that:
   - `blocker -> target` exists with `status = blocked`,
   - `target -> blocker` follow row is removed,
   - both close-friend rows are removed.

## Visibility Enforcement

1. Stay signed in as `target`.
2. Attempt to:
   - search for `blocker`,
   - open `blocker`'s profile directly,
   - load `blocker`'s posts/progress via normal app surfaces.
3. Confirm those surfaces are no longer readable to `target`.
4. Attempt to follow `blocker` again and confirm the request is rejected.

## Blocker-side Visibility

1. Sign back in as `blocker` while the block is still active.
2. Open the main feed and confirm `target`'s posts no longer appear.
3. Open Search, type `target`'s username, and confirm the blocked user does not appear in results.
4. Open `Profile Settings -> Blocked accounts` and confirm `target` appears there with an `Unblock` action.
5. Open `target`'s profile directly if you still have a route to it and confirm the locked state is shown instead of posts/progress content.
6. Keep Feed/Profile mounted while blocking from `UserProfile`, then navigate back and confirm Feed/Profile counts are already updated without requiring pull-to-refresh.

## Unblock Flow

1. Sign back in as `blocker`.
2. Open `Profile Settings -> Blocked accounts`, tap `Unblock`, and confirm the sheet action.
3. Confirm the blocked-accounts list updates immediately.
4. Confirm no follow or close-friend relationship is recreated automatically.
5. Confirm `target` can discover public profile surfaces again only after the unblock.
6. Return to Search and confirm `target` can appear again once the block is removed.
7. Confirm Feed/Profile/Search recover within the same session without forcing an app restart.
