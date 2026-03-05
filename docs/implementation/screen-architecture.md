# Screen Architecture Guide

Last updated: 2026-03-03

## Goal
- This file defines technical layer boundaries and extraction rules.

## Policy Rules
- Product policy source-of-truth lives in:
  - `docs/product/product-foundation.md`
  - `docs/product/accountability-and-social.md`
  - `docs/product/pro-coaching-and-safety.md`
  - `docs/product/roadmap-and-governance.md`

- Keep feature behavior easy to find and change.
- Reduce duplication across screens.
- Keep screens focused on orchestration and composition.

## Data Contracts

### Layer Boundaries
1. `screens/*`
- Own route params, navigation, and top-level gating states.
- Compose feature UI sections and shared components.
- Avoid direct data-access logic unless trivial.

2. `lib/features/*/use*.ts`
- Own feature state machines and view-model shape for screens/components.
- Delegate side-effect orchestration to `lib/features/*/workflows/*`.
- Expose a clear view-model style API for screens/components.
- Keep navigation out of hooks.

3. `lib/features/*/workflows/*`
- Own multi-step async workflows and side-effect orchestration.
- Coordinate service/data calls and normalize workflow-level outcomes.

4. `lib/features/*/*Client.ts` or `lib/data/*`
- Own network calls, request/response mapping, auth/session mechanics, and API error normalization.
- Reused by multiple hooks/screens.

5. `components/*`
- Presentational UI or narrowly scoped interactive UI.
- No cross-feature data fetching.

### Coach Surface Routing Contract
- `CoachWorkspace` is the canonical coach runtime surface for both plan and chat.
- `CoachChat` remains as a temporary compatibility route and must immediately redirect into `CoachWorkspace` with `tab: "chat"`.
- Route compatibility params (`prefill`, `inputMode`) are carried through `RootStackParamList` and consumed in workspace view-model hooks.

### Extraction Heuristics
- If logic appears in two screens, move it to `lib/features`.
- If a screen exceeds ~400 lines and mixes workflow logic with view rendering, extract a feature hook first.
- Extract UI components only when reused or when a section is conceptually distinct.
- If a flow does 3+ async calls, cross-module mapping, or optimistic + rollback behavior, extract it to `lib/features/*/workflows/*`.

### Refactor Rules
1. Preserve behavior while extracting.
2. Do logic extraction before visual restructuring.
3. Keep PRs/changesets vertical by feature.
4. Add tests for extracted pure logic where practical.

## UX States

- Screens orchestrate and compose; feature logic lives in hooks/workflows/services.
- Dependency direction remains one-way from UI to data.

## Analytics

- Architecture changes should preserve analytics instrumentation ownership boundaries.
- Do not couple event writes directly into presentational components.

## QA

### Architecture Lint Conventions
Run `npm run lint:arch` to enforce these dependency boundaries:

1. No Supabase imports in `screens/*`.
2. No cross-feature imports except through `lib/features/<feature>/index.ts`.
3. One-way dependencies: `screens -> hooks -> workflows -> services/models`.

### Testing Baseline
- Run `npm run validate` after each major phase.
- `validate` is the canonical gate: `lint:arch + typecheck + test + lint:unused`.
