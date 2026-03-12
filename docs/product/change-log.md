# Product Policy Change Log

## 2026-03-12 - Gym location permission disclosure clarified

### Added

- Gym proof permission policy:
  - show an in-app disclosure immediately before the first foreground location prompt for gym setup or gym-session verification.
  - disclosure must state location is used only while finding a gym or logging a gym session.
  - disclosure must state background location is not used and exact location is not shared in support posts.

### Changed

- Gym verification permission copy:
  - the OS-level location prompt copy should explicitly say location is used while the app is in use to verify gym check-ins at the saved gym.

### Removed

- Ambiguity around why gym-location access is requested during setup and check-in flows.

### Notes

- This is a copy and permission-timing clarification only; it does not add background location collection.

## 2026-03-11 - Agent legibility harness added to merge gate

### Added

- Contributor-governance policy:
  - `lint:legibility` is now a required merge gate for docs map integrity and section-contract enforcement.
- Implementation contract:
  - added `docs/implementation/agent-legibility-harness.md` as the canonical operational guide for agent-readable repo structure checks.

### Changed

- Quality gate policy:
  - `npm run validate` now executes `lint:legibility` before architecture, typing, tests, and unused export checks.
- Documentation index policy:
  - `docs/README.md` read order now includes the legibility harness guide near the top-level contributor map.

### Removed

- Reliance on manual spot-checking for AGENTS/docs reference drift and missing feature-doc section headings.

### Notes

- This is a governance/tooling policy update only; no user-facing product behavior changed.

## 2026-03-10 - Home summary favors latest logged weigh-in

### Added

- Home summary display policy:
  - show `Latest weigh-in` with the most recent logged weight when one exists.

### Changed

- Home fallback policy:
  - `Starting weight` is shown only before the user has logged their first weigh-in.

### Removed

- Home summary behavior that kept showing the original starting weight after newer weigh-ins existed.

### Notes

- Goal progress math already used the latest logged weigh-in; this change aligns the visible summary card with that behavior.

## 2026-03-10 - Apple Health weight import requires explicit save

### Added

- Weigh-in import policy:
  - iPhone users can pull the latest Apple Health weight into the `Log weigh-in` draft.

### Changed

- Accountability write policy:
  - Apple Health weight reads do not silently write to Stabilify; the imported draft only affects accountability after an explicit `Save`.

### Removed

- Implicit expectation that Apple Health weight access would auto-sync in the background.

### Notes

- Imported Apple Health samples still use the normal `weigh_ins` save path and same-day replacement rule.

## 2026-03-10 - Coach switching keeps saved setup

### Added

- Coach switching chooser policy:
  - when a saved coaching setup exists, switching to another coach offers `Keep current setup`, `Rebuild from current setup`, and `Edit setup first`.
- Coach removal preservation policy:
  - removing a coach returns the user to coach selection without erasing the saved coaching setup.

### Changed

- Coach persona selection policy:
  - all six personas must remain selectable in both onboarding and the coach picker.

### Removed

- Implicit destructive coach switching that silently replaced plans/chat without an explicit choice.

### Notes

- `Keep current setup` is intended as a voice/persona swap while preserving accepted plans and the saved coaching profile.

## 2026-03-10 - Weekly check-in wizard polish

### Added

- Weekly check-in create-mode input policy:
  - typed text and number fields should use example placeholders instead of seeded answers.
- Weekly check-in interaction policy:
  - focused multiline inputs must stay visible above the keyboard and bottom CTA.
- Weekly check-in review presentation policy:
  - final review should read like a completed form with section-level edit actions.

### Changed

- Weekly check-in nutrition/next-week capture policy:
  - replace the duplicate `Other blockers` prompt with a stomach/digestion question.
- Weekly check-in recovery presentation policy:
  - energy, recovery, sleep quality, and stress should use tighter scale-card controls rather than loose wrapped grids.
- Weekly check-in loading overlay policy:
  - progress must not reach `100%` before the submit workflow is actually complete.

### Removed

- Acceptance of prefilled typed answers on brand new weekly check-ins.
- Acceptance of duplicate next-week/blocker questioning inside the wizard.

### Notes

- Legacy `blockers` data remains supported for stored check-ins, but it is no longer a visible question in the new-create flow.

## 2026-03-10 - Support consent disclosure copy finalized

### Added

- Final explicit support-consent copy policy:
  - title `Allow private auto-support?`,
  - disclosure states posts go only to close friends,
  - disclosure states no weight, photos, or location details are shared,
  - acknowledgement states the current week's suppressed request stays suppressed and does not backfill.

### Changed

- Home nudge and Profile settings consent prompts now share the same disclosure copy.

### Removed

- Open-ended support-consent copy decision state.

### Notes

- OQ-002 is now decided and reflected in canonical product and implementation docs.

## 2026-03-09 - Social/account surface visual consistency

### Added

- Shared social/account surface visual policy:
  - `Feed`, `Profile`, and `Profile settings` should use a cohesive dark, minimal visual family.
- Profile settings presentation policy:
  - use full-width grouped rows with subtle dividers,
  - keep basic identity fields inline on the main edit surface,
  - avoid deeply nested card stacks for straightforward profile editing.

### Changed

- Profile settings visual direction:
  - moved closer to a native social-product edit screen instead of a dashboard/settings-card layout.

### Removed

- Implicit acceptance of deeply nested edit UI for top-level profile fields.

### Notes

- This is a presentation and consistency policy update; data contracts and save behavior remain immediate-save and unchanged.

## 2026-03-05 - Coach onboarding body profile + dual-track results review

### Added

- Coach onboarding body-profile capture policy:
  - include explicit sex selection values `male`, `female`, `other`.
- Post-onboarding results review policy:
  - show both `Training` and `Nutrition` track outcomes before dashboard/workspace navigation.

### Changed

- Coach onboarding defaults policy:
  - default weight set to `170 lb`,
  - default height set to `5'5"`,
  - untouched defaults are treated as valid onboarding inputs.
- Plan-start presentation policy:
  - one unified coach avatar is shown (no split workout/nutrition avatars).

### Removed

- Onboarding behavior that required manual picker movement to avoid height/weight validation errors.

### Notes

- Plan generation scope remains user-selected (`workout`, `nutrition`, `both`); results review still displays both tracks with generated/not-generated states.

## 2026-03-04 - Gym validation stale-request auto-expiry

### Added

- Validation stale-resolution policy:
  - open close-friend validation requests auto-expire when the linked session is no longer `provisional` (for example, owner verifies the same-day session through another path).
- Stale deep-link policy:
  - opening a stale validation request shows read-only `No action needed` UX.

### Changed

- Voting finality policy:
  - stale/closed requests are treated as non-actionable and must reject additional votes.

### Removed

- Implicit expectation that only time-based expiry closes open validation requests.

### Notes

- This prevents unnecessary friend actions and keeps Notifications actionable-only.

## 2026-03-04 - Home gym logging fixed-size inline flow

### Added

- Home gym logging presentation policy:
  - inline add-session flow uses one responsive fixed-height card across capture and analysis states.

### Changed

- Home gym logging interaction policy:
  - flow starts at step one without camera auto-open,
  - camera opens only on explicit user tap,
  - location permission is requested only when user taps location capture in step two,
  - analyzing is represented as explicit step four in flow progress,
  - lower Home gym CTA row is hidden while inline flow is active.

### Removed

- Standalone `LogGymSession` route/screen policy from active Home gym logging pathways.

### Notes

- This change reduces card-size jitter and duplicate CTA clutter while keeping gym logging inline on Today.

## 2026-03-03 - Auto-support re-consent timestamp refresh

### Added

- Re-enable consent audit policy:
  - accepting Profile settings auto-support confirmation refreshes `auto_support_consent_at` to the latest accepted timestamp.

### Changed

- Profile settings consent confirmation policy:
  - consent confirmation appears on every toggle to `ON`, including after turning auto support `OFF`.

### Removed

- None.

### Notes

- This keeps support posting behavior unchanged while improving consent recency tracking.

## 2026-03-03 - Support nudge hardening (Not now + atomic consent)

### Added

- Suppressed Home nudge defer policy:
  - `Not now` snoozes the card until the next user local day.
- Suppressed same-week post-consent Home state:
  - `suppressed_acknowledged` confirms consent saved without same-week backfill.

### Changed

- Explicitly require atomic persistence for Home `Allow auto-support`:
  - enable + consent writes must complete together.
- Explicitly require consent confirmation when turning on auto support from Profile settings without prior consent.

### Removed

- None.

### Notes

- Hardening is implementation-focused and preserves existing support trigger priority/outcome rules.

## 2026-03-03 - Behind-goal support automation phase 1

### Added

- Behind-goal support automation evaluator policy:
  - run once per user local day,
  - emit at most one support request per Monday-Sunday week.
- Canonical support trigger definitions:
  - `miss_trajectory_3_days` (3 consecutive no-gym days while weekly target remains unmet),
  - `missed_weekly_target` (impossible weekly gym pacing or end-of-week off-goal average),
  - `two_consecutive_missed_weeks` (weekly miss in both current + prior week).
- Home nudge card policy for support outcomes:
  - consent prompt for `suppressed_no_consent`,
  - re-enable guidance for `disabled`,
  - confirmation guidance for `published`.
- Push delivery retry baseline:
  - initial attempt plus 2 retries within 30 minutes.

### Changed

- Support trigger priority order locked to:
  - `two_consecutive_missed_weeks` > `missed_weekly_target` > `miss_trajectory_3_days`.
- Disabled outcome now includes users with zero close friends.
- Consent grant behavior clarified:
  - no same-week support-post backfill after a suppressed request.

### Removed

- Ambiguity around weekly multi-post behavior (resolved to one request per week).

### Notes

- OQ-001 and OQ-003 moved to decided; OQ-002 remains open for final consent copy.

## 2026-03-02 - Notifications inbox + evidence-gated gym validation (phase 3A)

### Added

- Notification inbox placement policy:
  - Home header bell with actionable count badge,
  - Profile menu secondary entry to the same inbox.
- Gym validation evidence review policy:
  - voting actions are available only in detail view,
  - detail view must show requester context, rounded distance, status reason copy, and proof photo.
- Validation request context policy:
  - optional requester note (`request_message`) capped at 180 chars.
- Proof-gated request policy:
  - close-friend validation request requires an existing proof photo.

### Changed

- Notifications scope v1 narrowed to actionable items only:
  - pending follow requests,
  - open gym validation requests.
- Gym validation list behavior changed from inline vote controls to `Review` CTA.

### Removed

- Inline `Accept/Decline` controls from gym validation list rows.

### Notes

- Phase 3A keeps the inbox derived from existing request tables (no standalone notifications table yet).

## 2026-03-02 - Gym close-friend validation phase 2

### Added

- Close-friend validation request lifecycle policy:
  - `open`
  - `accepted`
  - `declined`
  - `expired`
- Validation vote decisions:
  - `accept`
  - `decline`
- Eligibility policy for validation requests:
  - session must be `provisional`,
  - requester must own session,
  - requester must have at least one close friend.

### Changed

- Gym validation resolution policy:
  - first `accept` upgrades `provisional -> verified`,
  - first `decline` closes request as `declined`,
  - request expires after 48 hours.

### Removed

- None.

### Notes

- Phase 2 introduces secure request/vote workflows, requester/friend UX surfaces, and analytics instrumentation for validation lifecycle events.

## 2026-03-02 - Gym status reason policy phase 1

### Added

- Canonical `gym_sessions.status_reason` policy values:
  - `outside_radius`
  - `missing_photo`
  - `missing_location`
  - `missing_gym_setup`
  - `permission_denied`
  - `manual_override`

### Changed

- Gym proof policy now requires:
  - non-verified sessions to carry a canonical `status_reason`,
  - plain-English reason + next-action guidance in Home/log surfaces,
  - `verified` sessions to keep `status_reason = null` unless explicit admin override.

### Removed

- None.

### Notes

- Phase 1 only: status reason contracts and UX guidance shipped before close-friend validation workflow.

## 2026-03-02 - Context hardening and policy alignment update

### Added

- `docs/product/builder-context.md`
- `docs/product/open-questions.md`
- `docs/implementation/adr-0001-policy-priority-split.md`

### Changed

- Reworked `AGENTS.md` into decision table + canonical doc links.
- Added fixed feature-doc template requirements across product and implementation docs.
- Updated policy defaults:
  - hybrid priority split (accountability-first in free/shared surfaces, coaching-quality-first inside Pro coach surfaces),
  - gym proof status model (`verified`, `partial`, `provisional`),
  - support auto-post behavior (immediate publish, consent-gated),
  - behind-goal channels (in-app + push),
  - close-friends default cap (10),
  - Pro safety hard-stop and plan acceptance requirement.

### Removed

- 15-minute delayed support-post publish policy from canonical docs.

### Notes

- This entry introduces policy and contract changes that require synchronized schema/type/implementation updates.

## 2026-03-02 - Docs IA consolidation and policy canonicalization

### Added

- `docs/product/app-overview.md`
- `docs/product/product-foundation.md`
- `docs/product/accountability-and-social.md`
- `docs/product/pro-coaching-and-safety.md`
- `docs/product/roadmap-and-governance.md`
- `docs/product/change-log.md`

### Changed

- Consolidated product policy into 5 canonical docs plus this changelog.
- Codified launch defaults for:
  - primary segment,
  - MVP boundary,
  - social control model,
  - friend-validation fallback,
  - escalation cancel window,
  - anti-abuse defaults.

### Structure updates

- Moved implementation specs into `docs/implementation/`.
- Moved QA checklist into `docs/qa/`.
- Promoted `docs/README.md` to the single documentation index.

### Removed

- Removed legacy granular product-policy docs after merge into canonical files.
- Removed stale legacy feature-map doc.

### Notes

- Documentation-only restructuring. No runtime API, DB, or TypeScript contract changes.
