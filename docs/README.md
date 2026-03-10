# Documentation Index

Last updated: 2026-03-10

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
4. `docs/implementation/repo-navigation-map.md`
5. `docs/product/product-foundation.md`
6. `docs/product/accountability-and-social.md`
7. `docs/product/pro-coaching-and-safety.md`
8. `docs/product/roadmap-and-governance.md`
9. `docs/product/open-questions.md`
10. `docs/implementation/screen-architecture.md`
11. `docs/implementation/app-surface-strategy.md`
12. `docs/implementation/coach-system-plan.md`
13. `docs/implementation/adr-0001-policy-priority-split.md`
14. `docs/qa/coach-ui-manual-qa-checklist.md`
15. `docs/analytics/event-registry.md` (when analytics is affected)
16. `docs/analytics/tracking-changelog.md` (when analytics is affected)

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
