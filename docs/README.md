# Documentation Index

Last updated: 2026-03-02

## Purpose

Single index for product policy, implementation contracts, QA runbooks, and analytics taxonomy.

## Folder Layout

- `docs/product/` - canonical product policy and decision defaults.
- `docs/implementation/` - implementation contracts, architecture, and ADRs.
- `docs/qa/` - manual execution checklists.
- `docs/analytics/` - event registry and analytics history.

## Recommended Read Order

1. `AGENTS.md`
2. `docs/product/app-overview.md`
3. `docs/product/builder-context.md`
4. `docs/product/product-foundation.md`
5. `docs/product/accountability-and-social.md`
6. `docs/product/pro-coaching-and-safety.md`
7. `docs/product/roadmap-and-governance.md`
8. `docs/product/open-questions.md`
9. `docs/implementation/screen-architecture.md`
10. `docs/implementation/app-surface-strategy.md`
11. `docs/implementation/coach-system-plan.md`
12. `docs/implementation/adr-0001-policy-priority-split.md`
13. `docs/qa/coach-ui-manual-qa-checklist.md`
14. `docs/analytics/event-registry.md` (when analytics is affected)
15. `docs/analytics/tracking-changelog.md` (when analytics is affected)

## Canonical Product Files

- `app-overview.md`
- `builder-context.md`
- `product-foundation.md`
- `accountability-and-social.md`
- `pro-coaching-and-safety.md`
- `roadmap-and-governance.md`
- `open-questions.md`
- `change-log.md`

## Governance Rules

1. Keep policy decisions in `docs/product/*`.
2. Keep implementation details in `docs/implementation/*`.
3. Keep QA steps in `docs/qa/*`.
4. Keep analytics taxonomy/history in `docs/analytics/*`.
5. If files conflict, follow `AGENTS.md` + canonical product docs.

## Required Feature-Doc Template

Use this template in product + implementation specs:

1. `Goal`
2. `Policy Rules`
3. `Data Contracts`
4. `UX States`
5. `Analytics`
6. `QA`
