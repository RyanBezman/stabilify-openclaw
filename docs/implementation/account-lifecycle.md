# Account Lifecycle Implementation Contract

Last updated: 2026-03-13

## Goal

Define the implementation contracts for account deletion request, recovery gating, and final purge.

## Policy Rules

- The user-facing flow remains `Delete account` only.
- Deletion requests hide accounts immediately through lifecycle state and read-policy enforcement, not through a second user-facing deactivation mode.
- Recovery is allowed only while `scheduled_purge_at > now()`.
- Final purge is permanent and skips accounts under admin legal hold.

## Data Contracts

- Database:
  - `public.profiles.account_status`
  - `public.profiles.deletion_requested_at`
  - `public.profiles.scheduled_purge_at`
  - `public.profiles.deletion_legal_hold_at`
  - `public.profiles.deletion_legal_hold_reason`
- User-triggered RPCs:
  - `request_account_deletion()`
  - `restore_pending_account_deletion()`
- Client data API:
  - `lib/features/account-lifecycle/data.ts`
  - `fetchCurrentAccountLifecycleState(userId?)`
  - `requestCurrentUserAccountDeletion()`
  - `restorePendingAccountDeletion()`
- App gate:
  - `App.tsx` reads current lifecycle state after session bootstrap,
  - `screens/AccountDeletionRecovery.tsx` replaces `AuthedTabs` while status is `pending_deletion`.
- Purge worker:
  - Supabase Edge Function `supabase/functions/account-deletion/index.ts`
  - internal header token: `x-account-deletion-token`
  - runtime secret: `ACCOUNT_DELETION_PURGE_TOKEN`
  - scheduler secret in vault: `account_deletion_purge_token`
- Storage cleanup scope:
  - `profile-photos`
  - `post-photos`
  - `gym-proofs`

## UX States

- `screens/ProfileSettings.tsx` owns the danger-zone action and destructive confirmation sheet.
- `lib/features/profile-settings/useProfileSettingsScreen.ts` owns the delete-request mutation and local sign-out handoff.
- `screens/AccountDeletionRecovery.tsx` owns restore/sign-out actions during the grace window.
- `CoachProvider` receives `authUserId = null` while an account is pending deletion so coach state does not bootstrap.
- Coach Edge Functions reject `pending_deletion` users even if an old client attempts invocation.

## Analytics

- No analytics event names or payloads change.

## QA

1. Apply the migration and confirm `profile_directory` drops pending-deletion users automatically.
2. Confirm profile/posts/progress audience reads exclude pending-deletion accounts.
3. Confirm the purge worker removes media from all three buckets before deleting the auth user.
4. Confirm the hourly cron is scheduled only when `pg_cron`, `pg_net`, `vault`, and the purge secret are present.
5. Confirm recovery is blocked once `scheduled_purge_at` has passed.
