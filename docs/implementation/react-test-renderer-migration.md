# React Test Renderer Migration Plan

Last updated: 2026-03-04

## Goal

Remove reliance on deprecated `react-test-renderer` in Stabilify tests without reducing coverage.

## Policy Rules

- Keep behavior assertions unchanged while migrating test harnesses.
- Avoid broad refactors in production code just to satisfy tests.
- Migrate in small, reviewable batches by feature area.

## Data Contracts

- No runtime data contract changes expected.
- Test-only migration; production behavior must remain identical.

## UX States

Migration order:

1. Hook tests under `lib/features/*/hooks/*.test.ts`
2. Component tests under `components/**/*.test.tsx`
3. Remove `react-test-renderer` dependency once no imports remain.

## Analytics

- None.

## QA

- `npm run typecheck`
- `npm test`
- `npm run lint:arch`
- `npm run lint:unused`
- Grep check: no new `react-test-renderer` imports introduced.
