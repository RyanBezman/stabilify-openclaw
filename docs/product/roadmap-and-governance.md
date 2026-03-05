# Roadmap and Governance

Last updated: 2026-03-02

## Goal

Define active scope (`Now / Next / Later`) and documentation governance rules.

## Policy Rules

### Now

- Free accountability loop stability and clarity.
- Gym proof-state migration and validation upgrades.
- Behind-goal support automation with consent gate.
- Pro coach UX polish with nutrition-first quality improvements.
- Pro hard-stop safety behavior and explicit plan acceptance flow.

### Next

- Free macro logging foundation.
- Better support automation quality and anti-abuse tuning.
- Improved Pro nutrition depth.

### Later

- Connected-scale and broader ecosystem integrations.
- Advanced photo-based food analysis.

Scope rule:

- Pull-forward from `Next/Later` is allowed only with explicit policy updates in canonical docs.

## Data Contracts

- Preserve canonical terminology: `free`, `pro`, coach vocabulary, proof statuses.
- Support automation contract requires explicit consent field + published/suppressed/disabled outcomes.

## UX States

Non-goals/guardrails:

- do not optimize for virality over adherence,
- do not broadly expose sensitive behind-goal states by default,
- do not pro-gate core accountability workflows.

## Analytics

- Every analytics instrumentation change must update:
  - `docs/analytics/event-registry.md`
  - `docs/analytics/tracking-changelog.md`
- Event names in code must exactly match event registry names.

## QA

- Before merge, confirm:
  - policy docs and AGENTS remain aligned,
  - implementation/QA docs reflect policy changes,
  - analytics docs updated if tracking changes,
  - scope classification (`Now / Next / Later`) is unambiguous for new contributors.
