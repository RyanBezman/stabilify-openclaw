# Accountability and Social Policy

Last updated: 2026-03-12

## Goal

Define free-tier accountability behavior, gym proof states, and support escalation defaults.

## Policy Rules

- Free accountability contract includes:
  1. streak and completion visibility,
  2. weigh-in logging and cadence tracking,
  3. goal-aware range + weekly average context,
  4. gym-session tracking with proof-state handling,
  5. behind-goal nudges and support escalation.
- Weight accountability combines:
  - goal/range context,
  - cadence adherence,
  - weekly average trend.
- Keep range adherence and cadence adherence as separate signals.
- Social defaults are private-first.
- Blocking policy:
  - users can block and unblock another user from that user's profile,
  - blocking immediately removes any direct follow or close-friend relationship in either direction,
  - a blocked user cannot send a new follow request or view the blocker's searchable social surfaces,
  - accounts you have blocked should not appear in your Search results while the block is active,
  - blocked accounts must remain manageable from Profile Settings so the blocker can unblock without re-discovering the user in Search.
- Close-friend management:
  - users can review and remove close friends from their own Profile menu,
  - removal takes effect immediately for future support posts and gym validation requests.
- Support escalation behavior:
  - close-friends audience by default,
  - supportive/direct message tone,
  - immediate auto-post when triggered,
  - no delayed cancel window.
- Auto support defaults:
  - `auto_support_enabled` may default ON,
  - explicit user consent is required before first automated support post.
  - enabling auto support from settings requires explicit consent confirmation each time the toggle is turned on.
  - accepting the consent prompt refreshes `auto_support_consent_at` to the latest accepted timestamp.
  - consent disclosure copy must state that support posts go only to close friends, do not include weight, photo, or location details, and only affect future triggers.
- Support automation cadence:
  - evaluate support triggers daily (once per user local day),
  - persist at most one support request per Monday-Sunday week,
  - first qualifying reason wins for that week.
- Support trigger reason priority:
  - `two_consecutive_missed_weeks`
  - `missed_weekly_target`
  - `miss_trajectory_3_days`
- Consent recovery behavior:
  - granting consent after suppression does not backfill same-week posts,
  - future trigger evaluations may publish.
- Suppressed nudge defer behavior:
  - `Not now` snoozes the suppressed Home nudge until the next user local day.
- Consent action write safety:
  - `Allow auto-support` must persist enable + consent atomically.
- Behind-goal nudge channels: in-app + phone push.
- Close-friend network cap default: 10.

## Data Contracts

### Gym proof statuses

- `verified`: required proof complete (or valid friend-validation upgrade).
- `partial`: missing proof signal(s).
- `provisional`: not verified yet but eligible for friend-validation.

Mapping defaults:

- location mismatch => `provisional`.
- missing proof signal => `partial`.

### Gym proof status reasons

- Canonical `status_reason` values:
  - `outside_radius`
  - `missing_photo`
  - `missing_location`
  - `missing_gym_setup`
  - `permission_denied`
  - `manual_override`
- Status + reason policy:
  - `provisional` defaults to `outside_radius` when distance is outside gym range.
  - `partial` stores the best-known missing-signal reason.
  - `verified` keeps `status_reason = null` unless explicitly set by admin tooling (`manual_override`).

Validation upgrade:

- one close-friend validation upgrades `provisional -> verified`.
- Eligibility to request validation:
  - only `provisional` sessions are eligible,
  - request must be created by the session owner,
  - requester must have at least one close friend,
  - session must include a proof photo (`proof_path` required).
- Validation request context:
  - requester can include optional `request_message`,
  - message is trimmed and capped at 180 characters.
- Validation request lifecycle statuses:
  - `open`
  - `accepted`
  - `declined`
  - `expired`
- Validation vote decisions:
  - `accept`
  - `decline`
- Resolution rules:
  - first `accept` vote upgrades session `provisional -> verified`,
  - first `decline` vote closes request as `declined`,
  - requests expire at 48 hours from creation and close voting,
  - open requests auto-expire as stale when the session is already resolved (for example, upgraded/logged as `verified` by another path).

### Support trigger reasons

- `miss_trajectory_3_days`
- `missed_weekly_target`
- `two_consecutive_missed_weeks`

Trigger definitions:

- `miss_trajectory_3_days`:
  - no gym session logged on 3 consecutive local dates,
  - current week `verified` gym count remains below weekly gym target.
- `missed_weekly_target`:
  - weekly gym target is impossible to reach this week (`verified + remaining_days < target`),
  - or end-of-week weight average is off-goal with minimum 4 weigh-ins in both comparison weeks.
- `two_consecutive_missed_weeks`:
  - previous week and current week both satisfy `missed_weekly_target`.

Weekly average off-goal rules:

- `maintain`: current week average outside `[target_min, target_max]`.
- `lose`: current week average is at least `+2 lb` (or `+0.9 kg`) above previous week average.
- `gain`: current week average is at least `-3 lb` (or `-1.36 kg`) below previous week average.

### Support request statuses

- `published`
- `suppressed_no_consent`
- `disabled`

Status mapping:

- `published`:
  - `auto_support_enabled = true`,
  - `auto_support_consent_at` is present,
  - user has at least one close friend.
- `suppressed_no_consent`:
  - trigger qualifies while explicit consent is missing.
- `disabled`:
  - `auto_support_enabled = false`,
  - or user has zero close friends.

### Social relationship blocking

- Canonical block state:
  - `follows.status = blocked` means `follower_user_id` has blocked `followed_user_id`.
- Blocking side effects:
  - the block row replaces any existing same-direction follow row,
  - any reverse-direction follow row is deleted,
  - any close-friend link in either direction is deleted.
- Blocked-viewer read policy:
  - a blocker's profile directory row, profile, posts, public progress, and routine data are hidden from the blocked viewer.
- Blocker-side visibility policy:
  - while a block is active, the blocker's feed and profile-progress surfaces must not show the blocked user's posts or public progress until unblock.

## UX States

- Keep support payload minimal and non-sensitive by default.
- Default support message avoids exact weight/location/photo exposure.
- User profile relationship actions:
  - show `Block user` inside the other user's profile overflow actions,
  - show `Unblock user` and a locked-state message after the viewer blocks that user.
- Profile menu includes a `Close Friends` destination for managing the owner's close-friend list.
- Profile Settings includes a `Blocked accounts` destination for reviewing and unblocking blocked users.
- Close Friends screen behavior:
  - lists the owner's current close friends,
  - supports opening a listed user's profile,
  - supports destructive removal confirmation before deleting a close-friend link.
- Blocked Accounts screen behavior:
  - lists the owner's currently blocked users,
  - keeps blocked users out of Search while blocked,
  - supports confirmation before unblocking a listed user.
- iPhone `Log weigh-in` may import the latest Apple Health weight into the draft, but the user must explicitly save before it affects accountability data.
- If explicit consent is missing, show consent prompt and suppress automated posting.
- Home nudge card states:
  - consent prompt (`suppressed_prompt`) with title `Allow private auto-support?` and CTA `Allow auto-support` + `Not now`,
  - consent acknowledged (`suppressed_acknowledged`) with no same-week backfill reminder,
  - disabled guidance (`disabled`) with re-enable CTA,
  - published confirmation (`published`) with recovery guidance.
- Required consent copy:
  - title: `Allow private auto-support?`
  - disclosure: `When you're behind, Stabilify can post a private support request to your close friends. It won't share weight, photos, or location details.`
  - saved acknowledgement: `Private auto-support is on for future behind-goal triggers. This week's request stays suppressed and won't backfill.`
- Gym location permission disclosure must appear immediately before the first foreground location prompt used for gym setup or gym-session verification.
- Required gym location disclosure copy:
  - title: `Use location for gym check-ins?`
  - disclosure: `Stabilify uses your location only while you find your gym or log a gym session. This helps verify that a check-in happened at your saved gym so it can count as verified. We do not use background location, and your exact location is not shared in support posts.`
- Home + gym log surfaces must show plain-English reason text for non-verified gym sessions.
- Home + gym log surfaces must show next-action guidance for each non-verified `status_reason`.
- Notification entry points:
  - Home header bell shows open actionable request count,
  - Profile menu includes secondary entry to the same notifications inbox.
- Notifications inbox scope (v1):
  - pending follow requests,
  - open close-friend gym validation requests.
- Gym validation voting UX:
  - list rows show `Review` only for gym validation requests,
  - `Accept` / `Decline` is available only in detail view after opening evidence context.
  - stale/closed request deep links must show read-only `No action needed` copy.
- Gym validation detail must show:
  - requester identity,
  - optional `request_message`,
  - status-reason copy,
  - rounded distance context,
  - proof photo (when available).

## Analytics

Required events for this domain:

- `private_nudge_sent`
- `private_nudge_opened`
- `support_auto_post_published`
- `support_auto_post_suppressed_no_consent`
- `support_auto_post_setting_changed`
- `support_nudge_deferred`
- `gym_session_validation_requested`
- `gym_session_validation_submitted`
- `gym_session_upgraded_verified`
- `gym_session_validation_expired`

## QA

- Verify gym statuses and migration behavior:
  - legacy `pending -> partial`,
  - legacy `rejected -> provisional`.
- Verify status reason behavior:
  - `provisional` sessions store/display `outside_radius`,
  - `partial` sessions store/display the best-known missing-signal reason,
  - `verified` sessions keep `status_reason = null` unless explicit admin override.
- Verify friend-validation upgrade path and duplicate prevention.
- Verify request lifecycle transitions:
  - `open -> accepted`,
  - `open -> declined`,
  - `open -> expired`.
- Verify support automation outcomes:
  - published when enabled + consented,
  - suppressed when consent missing,
  - disabled when auto support off.
- Verify user blocking outcomes:
  - blocking a followed user removes the visible follow state,
  - blocking removes incoming follow access and close-friend ties,
  - blocked viewers cannot reload the blocker's searchable profile/feed surfaces,
  - blocked users do not appear in the blocker's Search results,
  - blocked users are visible in the blocker's blocked-accounts manager until unblocked,
  - unblocking restores the neutral `none` relationship state without auto-refollowing.
- Verify close-friend removal outcomes:
  - removed users disappear from the Close Friends screen immediately,
  - removed users no longer count toward close-friend-only support and validation eligibility.
- Verify one-request-per-week dedupe and first-reason freeze.
- Verify no same-week post backfill after consent is granted.
- Verify `Not now` hides suppressed nudge until next local day.
- Verify successful same-week consent switches to acknowledged nudge state.
- Verify impossible weekly target trigger and two-consecutive-miss escalation.
