# Builder Context (Persistent)

Last updated: 2026-03-09

## Goal

Capture durable product and collaboration defaults so implementation decisions stay consistent across coding sessions.

## Policy Rules

- Primary product outcome: user consistency and adherence.
- ICP priority: maintenance + gym consistency users.
- Free tier integrity: strict, no core accountability gating.
- Scope mode: flexible pull-forward with explicit policy updates.
- Hybrid priority rule:
  - `free` + shared surfaces: accountability-first.
  - Pro coach surfaces: safety-first, then coaching quality.
- Social defaults: private-first, close-friends escalation.
- Support escalation behavior:
  - format: close-friends feed post,
  - tone: supportive/direct,
  - trigger pipeline: backend daily evaluation,
  - publish behavior: immediate auto-post when triggered,
  - no 15-minute delay window.
- Support control defaults:
  - `auto_support_enabled`: on by default,
  - explicit consent required before first automated post.
- Close-friends launch limit: 10.
- Gym proof defaults:
  - statuses: `verified`, `partial`, `provisional`,
  - location mismatch => `provisional`,
  - missing proof => `partial`,
  - upgrade to verified requires 1 close-friend validation.
- Gym proof retention: auto-delete sensitive proof after 30 days.
- Pro coaching defaults:
  - keep all 6 personas,
  - weekly check-ins + light proactive prompts,
  - plan changes require explicit user acceptance,
  - hard-stop safety screen for medical-risk signals,
  - quality-over-cost model bias.

## Data Contracts

- Canonical tier names: `free`, `pro`.
- Week boundary: Monday-Sunday in saved profile timezone.
- Timezone changes do not rewrite historical entries.
- Tab naming remains `Coaches`.

## UX States

- Release mode: small beta cohort first.
- Platform quality bar: iOS first, Android parity immediately after stabilization.
- Offline mode: not in current scope (online-first).
- Visual language for social/account surfaces (`Feed`, `Profile`, `Profile settings`):
  - use a clean dark system with full-width rows and subtle dividers instead of stacked nested cards,
  - prefer edge-to-edge grouped sections over heavily boxed subcomponents,
  - keep headers simple and centered when the surface is primarily edit/settings-focused,
  - keep inline editing direct and visible instead of routing basic profile text fields into deeper drill-in screens,
  - preserve this visual family across adjacent identity/social surfaces so the app feels cohesive.

## Analytics

- Continue owner-level analytics dimensions:
  - `coach_persona`
  - `specialization`
  - `user_tier`
- Prioritize instrumentation for core-loop failures and support automation path.

## QA

- PR completion bar:
  - tests,
  - same-PR docs updates,
  - manual QA checklist run.
- Beta release blocker: any core-loop reliability regression.
