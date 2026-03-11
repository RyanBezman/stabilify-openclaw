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
- If one requested track fails to generate, onboarding still lands on `CoachOnboardingResults`, shows a warning banner, and marks only the failed track as `Not generated`.
- If nutrition snapshot loading fails after a partial success, `CoachOnboardingResults` still renders the workout card using the workout snapshot instead of collapsing into an error state.

3. Open `Coaches` tab.
Expected:
- Dashboard root loads (not coach workspace hub).
- For Pro users, no `Pro required` / `Upgrade to Pro` lock card flashes during initial tier check.
- When loading dashboard data for an already-selected coach, `Coach Dashboard` header + avatar stay anchored at top while body cards skeletonize.
- When an already-selected coach exists, the coach-selection skeleton must not flash on first load or tab revisit; use the dashboard shell/skeleton instead.
- After the dashboard has rendered once, switching tabs away and back must keep the current dashboard content mounted while refresh happens; no full-screen loader or transient lock card should appear on revisit.
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
- Review step shows a read-only completed-form layout with section `Edit` actions and submit CTA.
- Wizard includes the full v2 input set across steps:
  - weight, waist optional, body composition changes
  - progress photo prompted, training difficulty
  - energy/recovery/sleep/stress ratings
  - adherence percent + subjective
  - appetite/cravings
  - stomach / digestion notes
  - goal progress/PRs, consistency notes
  - schedule constraints next week
  - injury/pain + red-flag prompt
- New check-ins use example placeholders for typed inputs instead of prefilled answers.
- Focusing a multiline field such as `Appetite and cravings` keeps the active input visible above the keyboard and bottom CTA.
- Step-level choice buttons stay visually secondary, while the bottom `Continue` button remains the only strong primary CTA.
- Recovery step renders compact scale cards for energy, recovery, sleep quality, and stress without wrapping into a messy grid.

6. Submit a new weekly check-in.
Expected:
- Review-step submit succeeds with onboarding-style loading overlay.
- Loading overlay progress stays below `100%` until the submit flow is actually complete.
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
- If the overview already has data, revisiting the tab or triggering refresh should keep the current content mounted and use a non-blocking refresh state.

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
4. Opening `Training` or `Nutrition` from `CoachOnboardingResults` keeps the workspace header/top shell visible while the plan surface hydrates; the loading state must include the top header instead of rendering only the lower plan card body.
5. Removing coach from dashboard returns to selection UI.
6. Coach selection continues to show all six personalities for each gender in both the picker and onboarding persona step.
7. Switching to a different coach when saved setup exists opens a chooser with `Keep current setup`, `Rebuild from current setup`, and `Edit setup first`.
8. `Keep current setup` swaps the active coach without forcing onboarding, keeps accepted plans available after the next workspace hydrate, and clears old chat thread state.
9. Re-selecting the exact same coach through `Keep current setup` does not clear the existing thread history or delete saved draft plans.
10. `Rebuild from current setup` opens prefilled onboarding at review, and `Edit setup first` opens prefilled onboarding at the first editable step.
11. Removing a coach returns to selection without deleting the saved setup; selecting a new coach afterward still offers the chooser flow instead of forcing fresh onboarding.
12. If coach removal fails after only one specialization clears on the server, the previous workout + nutrition pairing is restored before the user retries; the next refresh must not show a split unified coach state.
13. Once `CoachWorkspace` or the dashboard has rendered usable content, tab revisits do not regress to a full-screen blocking loader unless the content was explicitly invalidated.
14. If a coach is already selected, tab revisits do not regress to the coach-picker loading skeleton while onboarding or tier checks refresh in the background.
15. Signing out and into a different account on the same device does not briefly show the previous account's coach selection, dashboard shell, chat history, or Pro lock/ready state before the new account finishes hydrating.
16. If a coach chat or weekly check-in request fails and retries while auth changes mid-request, the retry does not repair or overwrite the new account's coach selection.
17. Two accounts on the same device that select the same coach persona do not inherit each other's cached weekly check-in history, current check-in state, or wizard draft values before refresh completes.
18. If the user switches coaches while a background workspace prefetch is still in flight, the previous coach's thread, plan, or intake never flashes into the newly selected coach's workspace.
19. Switching from one coach to another within `CoachWorkspace` clears the previous coach's plan/chat surface immediately and shows a fresh blocking workspace skeleton until the new coach hydrates.
20. Resolving a nutrition draft only updates the matching user + coach session, and the weekly check-in review CTA stays cleared after navigating away and back.
21. If a coach chat reply or plan mutation is still in flight while the active coach changes, the late response from the old coach never restores old messages, plans, or loading overlays into the new coach workspace.
22. The shared `Coaches` dashboard preserves the last non-empty analytics rings/trends if the auxiliary nutrition check-in refresh fails while the main dashboard snapshot succeeds.
23. The shared `Coaches` dashboard reacts immediately to nutrition check-in submit and draft-resolution events even when the visible avatar/name came from the workout coach half of the unified selection.
24. After onboarding success, coach switch/remove, or sign-in to another account, `CoachWorkspace` and `CoachProfile` never resurrect an old coach from stale navigation params; they always reflect the live active selection once hydration completes.
25. If unified coach linking saves workout but fails to link nutrition, later refreshes do not restore the old nutrition coach; the server-side nutrition selection stays cleared until the user explicitly links or regenerates it.
