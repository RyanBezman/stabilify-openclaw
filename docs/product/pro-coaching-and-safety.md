# Pro Coaching and Safety Policy

Last updated: 2026-03-10

## Goal

Define Pro-tier coaching boundaries, quality defaults, and safety behavior.

## Policy Rules

- Pro includes:
  1. AI workout coaching.
  2. AI nutrition coaching.
  3. Weekly AI check-ins and adjustments.
- Keep one user-selected persona as the unified user-facing coach voice.
- Keep specialist workout/nutrition logic behind that single voice.
- Persona launch scope keeps all six personas.
- Pro coach onboarding is required before first workspace run; onboarding captures goal, schedule, constraints, body profile (including sex: `male | female | other`), and one unified persona for both workout and nutrition tracks.
- Coach personality selection must stay aligned across onboarding and picker surfaces; all six personas remain selectable in both places.
- Unified coach switching policy:
  - when a saved coaching setup already exists, selecting a different coach must offer:
    1. `Keep current setup`,
    2. `Rebuild from current setup`,
    3. `Edit setup first`,
  - `Keep current setup` changes persona/voice while keeping accepted plans and saved coaching profile,
  - `Rebuild from current setup` reuses the saved coaching profile and regenerates drafts for review,
  - `Edit setup first` reopens onboarding prefilled from the saved coaching profile before regeneration.
- Removing a coach means leaving the active coach selection, not erasing the saved coaching setup; after removal the user returns to coach selection and can later reattach a coach to the same saved setup.
- After onboarding plan generation, show a dual-track results review surface (Training + Nutrition) before routing users onward.
- Coach cadence:
  - weekly check-ins are required,
  - light proactive prompts are allowed.
- Weekly check-in UX policy:
  - use an onboarding-style step-by-step wizard for active weekly check-ins,
  - keep overview/history outside the wizard,
  - do not show the full check-in input set in one long form on the overview screen,
  - use example placeholders instead of prefilled typed answers for new check-ins,
  - keep the review step styled like a completed read-only form with section-level edit affordances.
- AI quality policy in Pro coach flows: prefer higher response quality over lower cost when safety is satisfied.
- Weekly adjustment application: require explicit user acceptance before plan promotion.

## Data Contracts

Safety contract fields for coaching responses:

- `safety_blocked: boolean`
- `safety_reason_code: string | null`
- `safety_message: string | null`

If `safety_blocked = true`, no plan-adjustment payload is applied.

## UX States

- Allowed: wellness guidance.
- Disallowed: diagnosis, treatment planning, or professional medical claims.
- Medical-risk behavior:
  - block normal coaching adjustments,
  - show safety screen,
  - recommend qualified professional consultation.

## Analytics

- Track safety-block outcomes and weekly check-in conversion after safety interruptions.
- Keep check-in funnel instrumentation aligned with event registry.

## QA

- Medical-risk input must return hard-stop safety response.
- No plan diff should be applied while safety-blocked.
- Weekly plan updates must remain pending until user acceptance.
- Weekly check-in should present one guided step at a time and end with a review step before submit.
- Weekly check-in should keep focused multiline responses visible above the keyboard and bottom CTA.
- Onboarding results review must show both tracks and clearly indicate generated vs not-generated states when user chose a single-track start.
- Switching coaches with saved setup must always present the chooser flow instead of silently replacing plans.
- Removing a coach must return to coach selection while keeping saved setup available for a later re-selection flow.
