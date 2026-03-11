# AGENTS Instructions for `stabilify`

## Decision Table

| Area | Default rule | Canonical detail |
| --- | --- | --- |
| Mission priority (`free` + shared surfaces) | Accountability outcomes > safety/privacy > engagement/monetization | `docs/product/product-foundation.md` |
| Priority inside Pro coach surfaces | Safety first, then AI coaching quality, then engagement | `docs/product/pro-coaching-and-safety.md` |
| Tier model | Use only `free` and `pro` (`membership_tier`) | `docs/product/product-foundation.md` |
| Free contract | Free remains complete accountability product | `docs/product/accountability-and-social.md` |
| Weight accountability | Weekly evaluation = goal context + cadence adherence + weekly average (Monday-Sunday, user timezone) | `docs/product/accountability-and-social.md` |
| Gym proof states | Canonical statuses: `verified`, `partial`, `provisional` | `docs/product/accountability-and-social.md` |
| Social support model | Private-first, close-friends support, minimal payload defaults | `docs/product/accountability-and-social.md` |
| Support auto-post | Immediate auto-post when triggered, no cancel delay, close-friends audience | `docs/product/accountability-and-social.md` |
| Support consent | Auto support can be enabled by default, but explicit consent is required before first automated post | `docs/product/accountability-and-social.md` |
| Pro coaching model | One unified persona voice across workout + nutrition with specialist internals | `docs/product/pro-coaching-and-safety.md` |
| Pro safety boundary | Wellness-only guidance, no diagnosis/treatment claims | `docs/product/pro-coaching-and-safety.md` |
| Roadmap control | Use `Now / Next / Later`; pull-forward allowed only with explicit policy updates | `docs/product/roadmap-and-governance.md` |
| Agent legibility gate | `npm run lint:legibility` must pass before merge | `docs/implementation/agent-legibility-harness.md` |
| TypeScript typing | `any` and `unknown` are forbidden in TypeScript code; use concrete domain types, typed payload contracts, and explicit type guards instead | `AGENTS.md` |

## Source Hierarchy

1. `AGENTS.md`
2. `docs/product/*`
3. `docs/implementation/*`
4. `docs/qa/*`
5. `docs/analytics/*`

If conflicts exist, align lower-level docs and implementation to `AGENTS.md` and canonical product docs immediately.

## Documentation Update Rules

- Required in every behavior-changing PR:
  - policy updates in `docs/product/*` when product rules change,
  - implementation contract updates in `docs/implementation/*` when data/API/workflow changes,
  - QA checklist updates in `docs/qa/*` when manual verification changes.
- Feature docs must use this section template:
  1. `Goal`
  2. `Policy Rules`
  3. `Data Contracts`
  4. `UX States`
  5. `Analytics`
  6. `QA`
- Keep docs references machine-checkable (`AGENTS.md`, `docs/README.md`) and run `npm run lint:legibility` after docs edits.
- Keep durable preferences in `docs/product/builder-context.md`.
- Track unresolved decisions in `docs/product/open-questions.md`.
- Record major policy updates in `docs/product/change-log.md`.

## Analytics Tracking Documentation (Required)

When analytics tracking is added, removed, renamed, or behavior changes (events, payload keys, required dimensions, instrumentation, SQL/view logic), update in the same change:

- `docs/analytics/event-registry.md`
- `docs/analytics/tracking-changelog.md`

Checklist before finishing:

- [ ] Event names in code exactly match `event-registry.md`.
- [ ] Required dimensions remain accurate.
- [ ] New/changed payload metadata keys are documented.
- [ ] Removed events are marked `removed` (do not delete history).
- [ ] `tracking-changelog.md` has dated `Added / Changed / Removed` entry with affected files and SQL/DB objects.

Preferred workflow: use skill `$analytics-tracking-log`.
