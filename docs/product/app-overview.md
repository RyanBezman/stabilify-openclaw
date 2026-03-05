# Stabilify App Overview

Last updated: 2026-03-02

## Goal

Provide a first-read summary of product scope and contributor expectations.

## Policy Rules

- Stabilify is consistency-first.
- `free` is complete accountability.
- `pro` adds deeper AI coaching.
- Current near-term bias:
  - accountability loop reliability,
  - coach UX polish,
  - support escalation automation.

## Data Contracts

- Tier names: `free`, `pro`.
- Week boundaries: Monday-Sunday in saved profile timezone.
- Gym proof statuses: `verified`, `partial`, `provisional`.
- Support request outcomes: `published`, `suppressed_no_consent`, `disabled`.

## UX States

Core loop:

1. User logs weigh-ins + gym sessions.
2. System evaluates adherence and proof status.
3. System nudges recovery and escalates support when rules trigger.
4. Pro users run weekly AI check-ins and optionally accept plan changes.

Launch defaults:

- private-first social posture,
- close-friends support visibility,
- immediate support auto-post after trigger (when enabled + consented),
- explicit consent required before first automated support post.

## Analytics

- Core-loop and support automation failures are top monitoring targets.
- Coach check-in funnel remains instrumented under analytics registry.

## QA

- Use canonical docs and implementation plans for detailed acceptance checks:
  - `docs/product/*`
  - `docs/implementation/*`
  - `docs/qa/*`
