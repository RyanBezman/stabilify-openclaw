# Product Foundation

Last updated: 2026-03-02

## Goal

Define mission, target user, priority rules, and tier boundaries for Stabilify.

## Policy Rules

- Mission: Stabilify is a consistency system first.
- Primary audience: maintenance + gym consistency users.
- `free` + shared surface decision priority:
  1. Accountability adherence outcomes.
  2. Safety/privacy-preserving behavior.
  3. Engagement/monetization.
- Pro coach surface decision priority:
  1. Safety/wellbeing.
  2. Coaching quality and clarity.
  3. Engagement/monetization.
- Tier names must remain code-aligned:
  - `free`
  - `pro`
- Tier boundary:
  - `free`: complete accountability product.
  - `pro`: deeper AI coaching and personalization.
- Core accountability actions must not be gated behind `pro`.

## Data Contracts

- Canonical tier enum: `membership_tier` with `free|pro`.
- Week cycle: Monday-Sunday in user saved timezone.
- Historical accountability data is not recomputed when timezone changes.

## UX States

- Launch path: small beta cohort.
- Platform quality bar: iOS first, then Android parity.
- Offline support: out of current scope (online-first).

## Analytics

Primary KPI orientation:

- weekly accountability completion,
- streak continuity,
- recovery speed after misses,
- range + cadence adherence.

Secondary KPIs (retention/revenue) must not regress primary adherence outcomes.

## QA

- Any priority or tier policy change must update:
  - `AGENTS.md`,
  - this file,
  - `docs/product/change-log.md`.
