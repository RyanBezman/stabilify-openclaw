# Agent Legibility Harness

Last updated: 2026-03-11

## Goal

Keep the repository easy for coding agents to navigate, edit safely, and verify without relying on long prompts.

## Policy Rules

- `AGENTS.md` stays concise and policy-first; detailed behavior lives in canonical docs.
- `docs/README.md` remains the first-pass map for where policy, implementation, QA, and analytics contracts live.
- Any change that updates contributor instructions, read-order maps, or section contracts must keep references and headings machine-checkable.

## Data Contracts

- Canonical command: `npm run lint:legibility`.
- `lint:legibility` enforces:
  - referenced doc paths in `AGENTS.md` and `docs/README.md` resolve,
  - `AGENTS.md` keeps required structure (`Decision Table`, `Source Hierarchy`) and stays concise,
  - product and implementation feature docs include sections:
    - `Goal`
    - `Policy Rules`
    - `Data Contracts`
    - `UX States`
    - `Analytics`
    - `QA`
- `npm run validate` is the merge gate and now runs `lint:legibility` before architecture/type/test checks.

## UX States

- `pass`: legibility checks clear and agent map/contracts are consistent.
- `reference-fail`: broken file links in contributor maps (`AGENTS.md`, `docs/README.md`).
- `template-fail`: missing required feature-doc sections in product or implementation docs.

## Analytics

- No analytics events are emitted by this harness.

## QA

- Run `npm run lint:legibility` for any docs/governance change.
- Run `npm run validate` before merge for behavior, structure, or docs updates.
