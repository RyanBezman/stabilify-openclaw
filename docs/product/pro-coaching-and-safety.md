# Pro Coaching and Safety Policy

Last updated: 2026-03-04

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
- After onboarding plan generation, show a dual-track results review surface (Training + Nutrition) before routing users onward.
- Coach cadence:
  - weekly check-ins are required,
  - light proactive prompts are allowed.
- Weekly check-in UX policy:
  - use an onboarding-style step-by-step wizard for active weekly check-ins,
  - keep overview/history outside the wizard,
  - do not show the full check-in input set in one long form on the overview screen.
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
- Onboarding results review must show both tracks and clearly indicate generated vs not-generated states when user chose a single-track start.
