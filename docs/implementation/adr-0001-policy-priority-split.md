# ADR-0001: Priority Split Between Free/Shared and Pro Coach Surfaces

Last updated: 2026-03-02

## Goal

Codify the decision hierarchy split so engineering does not make inconsistent tradeoffs across accountability and Pro coach surfaces.

## Policy Rules

- `free` + shared surfaces use priority order:
  1. Accountability outcomes.
  2. Safety/privacy behavior.
  3. Engagement/monetization.
- Pro coach surfaces use priority order:
  1. Safety/wellbeing.
  2. Coaching quality and clarity.
  3. Engagement/retention.

## Data Contracts

- Applies to all decisions touching:
  - `screens/AuthedHome.tsx`, accountability logging flows, and social defaults,
  - Pro coach flows (`screens/Coaches.tsx`, `screens/CoachCheckins.tsx`, `screens/CoachChat.tsx`, `screens/CoachWorkspace.tsx`),
  - `supabase/functions/coach-chat/*`.

## UX States

- Free/shared surfaces preserve simplicity and consistency-first execution.
- Pro coach surfaces can bias toward richer, higher-quality AI outputs if safety remains satisfied.

## Analytics

- Prioritize tracking reliability/failure in core accountability loop and safety-block events in Pro coach flows.

## QA

- Any PR changing this split must update:
  - `AGENTS.md`,
  - `docs/product/product-foundation.md`,
  - `docs/product/pro-coaching-and-safety.md`,
  - `docs/product/change-log.md`.
