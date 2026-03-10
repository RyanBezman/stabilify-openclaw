# Repo Navigation Map

Last updated: 2026-03-10

## Goal

Make first-pass navigation predictable for product work, bug fixing, and future refactors.

## Policy Rules

- Follow source priority in `AGENTS.md`.
- Product decisions live in `docs/product/*`.
- Shared cross-feature utilities live in `lib/features/shared/*` and are consumed through `lib/features/shared/index.ts`.
- Screens should stay route-facing and composition-first; feature hooks own state, workflows own multi-step async orchestration, and services/data modules own network/storage.

## Data Contracts

### App Shell Ownership

- `App.tsx` owns app bootstrap, providers, and navigation root wiring.
- `screens/AuthedTabs.tsx` owns authenticated tab structure and tab-level route redirects.
- `lib/navigation/types.ts` is the canonical route contract for stack and tab params.

### Surface Ownership

- Home:
  - Route: `screens/AuthedHome.tsx`
  - Feature API: `lib/features/dashboard/index.ts`
  - Main hooks/models: `useAuthedHome.ts`, `useAuthedHomeGymFlow.ts`, `models/stepSummary.ts`
  - Shared data sources: `lib/data/dashboard.ts`, `lib/data/appleHealth.ts`, `lib/data/supportAutomation.ts`
  - Edit here for: Home loading states, step summary behavior, support nudge behavior, gym capture/validation orchestration

- Profile Settings:
  - Route: `screens/ProfileSettings.tsx`
  - Feature API: `lib/features/profile-settings/index.ts`
  - Main hooks/models: `useProfileSettings.ts`, `useProfileSettingsScreen.ts`, `editableFields.ts`
  - Shared data sources: `lib/features/profile-settings/data.ts`, `lib/data/supportAutomation.ts`, `lib/data/appleHealth.ts`
  - Edit here for: immediate-save settings, consent flows, push registration behavior, photo/debug actions, text-field previews

- Coaches:
  - Routes: `screens/CoachDashboard.tsx`, `screens/CoachWorkspace.tsx`, `screens/CoachOnboardingFlow.tsx`, compatibility route `screens/CoachChat.tsx`
  - Feature API: `lib/features/coaches/index.ts`
  - Main hooks/workflows: `hooks/useCoachWorkspace.ts`, `hooks/useCoachDashboard.ts`, `hooks/useCoachCheckins.ts`, `workflows/*`
  - Shared data/services: `services/dashboard.ts`, `services/checkins.ts`, `services/chatClient.ts`, `services/api.ts`
  - Edit here for: onboarding gating, dashboard refresh behavior, check-in orchestration, workspace plan/chat flows

- Feed and Profile:
  - Routes: `screens/Feed.tsx`, `screens/Profile.tsx`, `screens/UserProfile.tsx`
  - Feature APIs: `lib/features/feed/*`, `lib/features/profile/*`
  - Shared data sources: `lib/data/posts.ts`, `lib/data/userDirectory.ts`, `lib/data/relationships.ts`
  - Edit here for: feed pagination, follow actions, profile identity/loading behavior

- Gym logging and verification:
  - Routes: `screens/LogGymSession.tsx`, `screens/GymSettings.tsx`
  - Feature APIs: `lib/features/log-gym-session/*`, `lib/features/gym-settings/*`
  - Shared data sources: `lib/data/gymSessions.ts`, `lib/data/gymSessionValidation.ts`, `lib/data/gyms.ts`
  - Edit here for: camera/location capture, provisional verification, saved gym defaults

### Shared Cross-Feature Contracts

- `lib/features/shared/surfaceLoadState.ts` defines the canonical loading vocabulary for screen-facing hooks.
- `lib/features/shared/pushNotifications.ts` owns Expo push permission + token + active-device registration behavior.
- `lib/features/shared/result.ts` owns result helpers and session-required error normalization.

### Data Layer Ownership

- `lib/data/*` owns app-wide data access used across multiple features.
- `lib/features/*/data.ts` or `services/*` own feature-local request mapping and storage.
- `lib/features/*/workflows/*` own multi-call orchestration, optimistic state handling, and rollback logic.

### Supabase Function Ownership

- `supabase/functions/coach-chat/*` owns unified coach planning/chat inference and coach-specific guardrails.
- `supabase/functions/coach-voice/index.ts` owns coach voice generation.
- `supabase/functions/support-nudge-push-dispatch/index.ts` owns queued support-nudge push delivery retries and inactive-device handling.

## UX States

- Screen-level blocking loaders are allowed only for the first unusable load.
- Once a surface has rendered usable content, tab revisits and focus refreshes should keep that content mounted and move into non-blocking refresh states.
- Touched screen-level hooks should expose view-model contracts that already answer:
  - whether blocking skeletons are allowed,
  - whether a background refresh is in progress,
  - whether cached content is usable,
  - whether a user-triggered mutation is active.

## Analytics

- No analytics event names change in this map.
- When editing support automation, profile settings, or coach funnels, verify related docs in `docs/analytics/*` if instrumentation changes.

## QA

- Read this file before large refactors or when assigning a bug to a surface.
- After changing Home, Profile Settings, or Coaches, run `npm run validate`.
- For touched user-facing flows, update the relevant checklist in `docs/qa/*` in the same change.
