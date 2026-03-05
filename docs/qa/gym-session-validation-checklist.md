# Gym Session Validation QA

Last updated: 2026-03-02

## Goal

Verify close-friend validation request/vote workflows, security boundaries, request lifecycle state transitions, and analytics coverage.

## Policy Rules

- Requests are allowed only for `provisional` sessions.
- Requester must own the session and have at least one close friend.
- Request creation requires a proof photo on the provisional session.
- Requester can attach optional note (`request_message`, max 180 chars).
- First `accept` upgrades session to `verified`.
- First `decline` closes request as `declined`.
- Requests expire after 48 hours.
- Requests also auto-expire when the linked session is already resolved (`status <> provisional`).

## Data Contracts

- `public.gym_session_validation_requests.status` is one of:
  - `open`, `accepted`, `declined`, `expired`
- `public.gym_session_validation_requests.request_message`:
  - optional,
  - trimmed,
  - <= 180 characters
- `public.gym_session_validation_votes.decision` is one of:
  - `accept`, `decline`
- One open request per session (partial unique index).
- One vote per friend per request (unique index).

## UX States

- Home provisional card:
  - shows `Request close-friend validation` CTA when request is not open,
  - shows request state chip for `open|accepted|declined|expired`.
- Home header:
  - shows bell icon with actionable notifications count badge.
- Notifications screen:
  - shows mixed actionable items (follow + gym validation),
  - follow requests keep inline `Accept/Reject`,
  - gym validation rows show `Review` CTA only (no inline vote controls).
- Gym validation detail screen:
  - shows requester, optional note, rounded distance, reason copy, proof photo,
  - gates `Accept/Decline` behind detail view.

## Analytics

- Confirm event inserts for:
  - `gym_session_validation_requested`
  - `gym_session_validation_submitted`
  - `gym_session_upgraded_verified`
  - `gym_session_validation_expired`
- Confirm metadata keys align with `docs/analytics/event-registry.md`.

## QA

1. Create provisional session with close friends configured.
2. Request validation and verify request row is created as `open` with 48h expiry.
3. Attempt second open request for same session and confirm it is blocked.
4. Attempt request for non-provisional session and confirm it is blocked.
5. As close friend, submit `accept` and verify:
   - vote row created,
   - request transitions to `accepted`,
   - session transitions to `verified`,
   - `verified_at` is non-null.
6. As close friend, submit `decline` on a separate open request and verify request becomes `declined` without session upgrade.
7. Attempt duplicate vote from same friend and confirm it is blocked.
8. Attempt vote from non-close-friend and confirm it is blocked by policy.
9. Attempt self-vote as requester and confirm it is blocked.
10. Force request past expiry and verify:
    - request transitions to `expired`,
    - voting is blocked,
    - expired event is recorded.
11. Create open request, then verify same-day session through non-vote path and confirm:
    - request transitions to `expired`,
    - notifications row disappears from actionable inbox,
    - stale deep link shows read-only no-action-needed copy.
12. Confirm Home bell + Profile menu badge count reflects open actionable request count.
13. Confirm follow requests resolve inline and update badge count.
14. Confirm gym validation row opens detail view via `Review` and has no list-level voting.
15. Confirm detail view supports vote submit and updates inbox/badge after navigation back.
16. Confirm `Accept` is disabled in detail view when proof photo is unavailable.
17. Confirm weekly completion/streak logic still counts only `verified` sessions.
18. Confirm proof photo card never renders blank state:
   - valid proof object shows image,
   - missing/corrupt/non-image response shows explicit error text and storage path hint.
