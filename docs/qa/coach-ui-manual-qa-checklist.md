# Coach UI Manual QA Checklist (v1)

Last updated: 2026-03-10

## Canonical References
- Product policy:
  - `docs/product/pro-coaching-and-safety.md`
  - `docs/product/accountability-and-social.md`
  - `docs/product/roadmap-and-governance.md`
- Implementation specs:
  - `docs/implementation/coach-system-plan.md`
  - `docs/implementation/screen-architecture.md`

## Scope
- Coaches tab dashboard root (`Today`, `Plans`, `This week`, floating `Chat with Coach` action)
- Unified coach chat entry routed through `CoachWorkspace` chat tab
- Pro coach onboarding flow (`CoachOnboardingFlow`) before first workspace run
- Weekly check-in overview + onboarding-style wizard flow + save/update behavior

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
- Dashboard uses full-width app shell (no centered max-width coach column).
- Dashboard exposes a floating `Chat with Coach` CTA above the tab bar instead of a header chat control.
- Sections appear in order: `Today`, `Plans`, `This week`.
- `Today` is rendered as a full-width header band, should look visually distinct from the stacked cards below it, and should not use top/bottom framing borders.
- `Today` references plans only and does not show a summary directive line.
- `Today` shows exactly two inline summary items: `Workout` and `Macros` (no hydration/recovery reminder rows).
- `Today` stays compact and minimal, using a low-height inline strip instead of expanded tiles or table-style rows.
- `Macros` stays condensed to a single compact summary rather than rendering separate `Protein`, `Carbs`, and `Fat` rows.
- `Plans` remains a permanent section directly below `Today`.
- `This week` reads as one grouped section rather than separate `Performance` and `Weekly recap` modules.
- `This week` shows two rings (`Adherence`, `8wk completion`) plus streak and nutrition target metrics above the weekly status card.

2. Tap floating `Chat with Coach`.
Expected:
- Opens `CoachWorkspace` with `Chat` tab selected.
- Compatibility route `CoachChat` (if invoked by stale deep link) redirects to the same workspace chat tab.
- Header subtitle reads `Unified Training + Nutrition chat`.
- No workout/nutrition toggle pills are visible.

3. Return to dashboard and inspect track cards.
Expected:
- Track labels are exactly `Training` and `Nutrition`.
- Track cards appear inside the shared `Plans` section instead of as a conditional dashboard row.
- Track cards show explicit state chips (for example `Setup needed`, `Pending approval`) instead of percentage plan-status bars.
- Track cards do not render a bottom summary line for session preview or macro targets.
- Track cards do not show long inline CTA sentences; each card indicates clickability via a compact violet `Open` badge instead of a trailing chevron.
- Nutrition card shows targets summary and remains fully tappable to open the plan surface.

4. Open `Weekly Check-in` from dashboard.
Expected:
- Screen title is `Weekly check-in`.
- Current week range is displayed.
- `This week` preview and `History` entries render as full-width flat rows with divider lines rather than compact nested cards.
- Overview does not show the full input set at once.
- Empty-state CTA opens a dedicated full-screen wizard with progress bar, step count, hero copy, and bottom CTA.

5. Walk through a new weekly check-in wizard.
Expected:
- Step order is:
  - body metrics
  - training recap
  - nutrition recap
  - recovery
  - next week
  - pain / safety
  - review
- `Back` returns to the prior step; backing out of the first step exits to overview mode.
- Previously entered values remain in memory when closing and reopening the wizard during the same screen session.
- Review step shows editable summary cards and submit CTA.
- Wizard includes the full v2 input set across steps:
  - weight, waist optional, body composition changes
  - progress photo prompted, training difficulty
  - energy/recovery/sleep/stress ratings
  - adherence percent + subjective
  - appetite/cravings
  - goal progress/PRs, consistency notes
  - schedule constraints next week
  - injury/pain + red-flag prompt
  - optional blockers

6. Submit a new weekly check-in.
Expected:
- Review-step submit succeeds with onboarding-style loading overlay.
- Screen returns to overview mode with success banner.
- History shows newest entry first.
- Existing current-week entry switches to edit/update behavior.

7. Edit the newest same-week check-in and save.
Expected:
- Opening from `Edit` resumes the wizard instead of showing a long inline form.
- Review-step button label changes to `Update weekly check-in`.
- History keeps one current-week row and reflects updated values.

8. Pull to refresh / tap refresh in check-ins.
Expected:
- Refresh state appears and completes without duplicate entries.
- History rows keep full-width spacing and remain readable with long coach summaries.

9. Return to dashboard.
Expected:
- Lower section shows `This week` with a nested `Weekly check-in` card.
- `Weekly check-in` includes:
  - adherence ring with latest percentage
  - three status rows:
  - `Completed check-in` (Yes/No)
  - `Plan accepted` (Yes/No/Pending)
  - `Adherence trend` (Up/Down/Flat/No trend yet)
- CTA text is `Do weekly check-in` or `Preview last check-in` based on due state.
- Skeleton state mirrors the final hierarchy: header remains anchored, and the body skeleton shows a compact `Today` snapshot, then `Plans`, then `This week`.

## Regression checks
1. Membership lock path still routes to Billing screen.
2. Pro users opening `Coaches` do not briefly render the lock card before dashboard content.
3. `Training` and `Nutrition` cards still open relevant plan screens.
4. Removing coach from dashboard returns to selection UI.
