# Screen Architecture Guide

Last updated: 2026-03-10

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
- Keep screens focused on route params, layout, and composition.

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

### Shared Loading-State Contract
- Touched screen-facing hooks should normalize loading into:
  - `blockingLoad`
  - `hydrated`
  - `refreshing`
  - `mutating`
  - `hasUsableSnapshot`
- Full-screen loaders and skeleton-only states are allowed only when `blockingLoad && !hasUsableSnapshot`.
- `hydrated` means bootstrap/session/cache readiness and must not, by itself, flip a screen back to blocking UI once usable content exists.
- Focus refresh, tab revisit refresh, and pull-to-refresh should preserve the current snapshot and move the surface into `refreshing`.
- Hooks that can issue overlapping loads on focus/tab changes must either dedupe the request or ignore stale responses.

### Shared Seams
- Shared Expo push permission + token + device registration logic belongs in `lib/features/shared/pushNotifications.ts`.
- Shared screen-loading derivation belongs in `lib/features/shared/surfaceLoadState.ts`.
- Shared view-model types that collapse route-level branching belong in feature models, for example Home step summaries in `lib/features/dashboard/models/stepSummary.ts`.

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
- For large surfaces, screens should prefer composition-only behavior and consume route-facing view models from `lib/features/<feature>/index.ts`.
- Dependency direction remains one-way from UI to data.
- The app shell owns the full-device background color at the navigation root so top and bottom safe-area regions paint consistently on Dynamic Island, notch, and home-indicator devices.
- Full-screen routes should use the shared `AppScreen` shell so safe-area padding is applied consistently without clipping the device frame.
- Form, list, and detail routes that should stay readable on tablets or landscape phones should set `maxContentWidth` on `AppScreen` instead of letting content stretch edge-to-edge.
- Modal panels and sheets should fill the available screen bounds and apply safe-area padding to their inner content instead of shrinking the outer container with inset offsets.

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
- `validate` is the canonical gate: `lint:legibility + lint:arch + typecheck + test + lint:unused`.
- Loading-state regressions to watch for:
  - tab revisit causing a full-screen loader after usable content already exists,
  - hydration flags being treated as blocking load,
  - focus refresh clearing content before new data arrives,
  - overlapping requests overwriting newer snapshots.
