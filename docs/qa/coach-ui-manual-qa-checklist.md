# Coach UI Manual QA Checklist (v1)

Last updated: 2026-03-09

## Canonical References
- Product policy:
  - `docs/product/pro-coaching-and-safety.md`
  - `docs/product/accountability-and-social.md`
  - `docs/product/roadmap-and-governance.md`
- Implementation specs:
  - `docs/implementation/coach-system-plan.md`
  - `docs/implementation/screen-architecture.md`

## Scope
- Coaches tab dashboard root (`Today`, `Training`, `Nutrition`, `Weekly recap` cards)
- Unified coach chat entry routed through `CoachWorkspace` chat tab
- Pro coach onboarding flow (`CoachOnboardingFlow`) before first workspace run
- Weekly check-in v2 form fields + save/update behavior

## Devices
- iPhone 17 Pro (or iPhone 15 Pro)
- iPhone SE (3rd generation) for compact layout

## Preconditions
- User is signed in.
- User has an active coach selected (workout + nutrition linked).
- Membership tier allows coach features (Pro).

## Automated preflight (already run)
- `npm run validate` passes.
- `npm test -- lib/features/coaches/services/checkins.test.ts lib/features/coaches/workflows/coachCheckinsWorkflow.test.ts lib/features/coaches/hooks/useCoachCheckins.test.ts` passes.
- `npm test -- lib/features/coaches/models/coachChatRoute.test.ts lib/features/coaches/hooks/useCoachVoiceComposer.test.ts` passes.
- `npm test -- lib/features/feed/hooks/useFeed.test.ts lib/features/profile/hooks/useUserFollowActions.test.ts` passes.
- Coach surfaces contain no `daily check-in` copy.

## Manual steps
1. Start from a Pro account with no `coach_user_profiles` onboarding profile (or clear onboarding fields).
Expected:
- Opening `CoachWorkspace` routes into `CoachOnboardingFlow` instead of plan/chat.
- Progress bar + step count are visible.
- Back/Continue controls work per step.

2. Complete onboarding and submit `Build my plan`.
Expected:
- Submission shows loading state (`Generating your plans...`).
- Onboarding includes an explicit `Sex` step with options `Male`, `Female`, `Other`.
- Height/weight defaults (`5'5"`, `170 lb`) can be accepted without triggering validation errors.
- Plan-start step shows one unified coach avatar (no split workout/nutrition avatars).
- User is routed to `CoachOnboardingResults` after success.
- Results screen shows both `Training` and `Nutrition` cards with generated/not-generated status and per-track CTAs.

3. Open `Coaches` tab.
Expected:
- Dashboard root loads (not coach workspace hub).
- For Pro users, no `Pro required` / `Upgrade to Pro` lock card flashes during initial tier check.
- When loading dashboard data for an already-selected coach, `Coach Dashboard` header + avatar stay anchored at top while body cards skeletonize.
- Dashboard stays centered in a wider coach shell and does not stretch edge-to-edge on wide devices.
- Sections appear in order: `Coach Chat`, `Today`, `Plans`, `Weekly recap`.
- `Plans` renders `Training` and `Nutrition` as paired sibling cards inside one full-width section.

2. Tap `Coach Chat`.
Expected:
- Opens `CoachWorkspace` with `Chat` tab selected.
- Compatibility route `CoachChat` (if invoked by stale deep link) redirects to the same workspace chat tab.
- Header subtitle reads `Unified Training + Nutrition chat`.
- No workout/nutrition toggle pills are visible.

3. Return to dashboard and inspect track cards.
Expected:
- Track labels are exactly `Training` and `Nutrition`.
- Track cards appear inside the shared `Plans` section instead of as a standalone dashboard row.
- Training CTA is `Start workout` or `View plan`.
- Nutrition card shows targets summary and valid CTA text.

4. Open `Weekly Check-in` from dashboard.
Expected:
- Screen title is `Weekly check-in`.
- Current week range is displayed.
- Form includes the full v2 input set:
  - weight, waist optional, progress photo prompted
  - training difficulty
  - energy/recovery/sleep/stress ratings
  - adherence percent + subjective
  - appetite/cravings
  - goal progress/PRs, consistency notes, body comp changes
  - schedule constraints next week
  - injury/pain + red-flag prompt
  - optional blockers

5. Submit a new weekly check-in.
Expected:
- Save succeeds with success banner.
- History shows newest entry first.
- Existing current-week entry switches to edit/update behavior.

6. Edit the newest same-week check-in and save.
Expected:
- Button label changes to `Update weekly check-in`.
- History keeps one current-week row and reflects updated values.

7. Pull to refresh / tap refresh in check-ins.
Expected:
- Refresh state appears and completes without duplicate entries.

8. Return to dashboard.
Expected:
- Weekly card shows `Weekly recap`.
- Three rows render:
  - `Completed check-in` (Yes/No)
  - `Plan accepted?` (Yes/No/Pending)
  - `Adherence trend` (Up/Down/Flat/No trend yet)
- CTA text is `Do weekly check-in` or `Preview last check-in` based on due state.
- Skeleton state mirrors the final hierarchy: header remains anchored, and the body skeleton shows `Coach Chat`, `Today`, grouped `Plans`, and `Weekly recap`.

## Regression checks
1. Membership lock path still routes to Billing screen.
2. Pro users opening `Coaches` do not briefly render the lock card before dashboard content.
3. `Training` and `Nutrition` cards still open relevant plan screens.
4. Removing coach from dashboard returns to selection UI.
