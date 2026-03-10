# Open Questions

Last updated: 2026-03-10

## Goal

Track unresolved product/implementation decisions that materially affect scope, interfaces, or rollout.

## Policy Rules

- Keep each item explicit, scoped, and owner-assigned.
- Update status when resolved and mirror final decision to canonical docs.

## Data Contracts

| ID | Question | Owner | Status | Target |
| --- | --- | --- | --- | --- |
| OQ-001 | Should support auto-post trigger once per week or allow multiple posts per week by reason? | Product | decided (`once per week`) | 2026-03-03 |
| OQ-002 | What final copy should be used for explicit support consent and safety disclosures? | Product + Design | decided (`Allow private auto-support?` + private close-friends / no weight-photo-location details / future-only no-backfill acknowledgement) | 2026-03-10 |
| OQ-003 | How should push delivery retries/dedupe be tuned for behind-goal nudges? | Eng | decided (`2 retries within 30 min`) | 2026-03-03 |
| OQ-004 | Should friend validation include validator reputation/rate limits beyond pair anomaly flags? | Product + Eng | open | Before broad social rollout |

## UX States

- `open`: unresolved.
- `decided`: resolution approved and merged to canonical docs.
- `deferred`: intentionally postponed with revisit milestone.

## Analytics

- No analytics changes from this register alone.

## QA

- Before closing any open item:
  - policy doc updated,
  - implementation contract updated if needed,
  - changelog updated.
