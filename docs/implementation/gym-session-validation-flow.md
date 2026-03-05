# Gym Session Close-Friend Validation Flow

Last updated: 2026-03-02

## Goal

Implement close-friend validation so eligible `provisional` gym sessions can be upgraded to `verified` with explicit request state and secure voting.

## Policy Rules

- Only `provisional` sessions are eligible for close-friend validation requests.
- Request must be created by the session owner.
- Requester must have at least one close friend.
- Session must include a proof photo (`proof_path` non-null) before request can be created.
- Request expires 48 hours after creation.
- Open requests also expire early when the linked session is no longer `provisional` (already resolved).
- First `accept` vote upgrades the session to `verified`.
- First `decline` vote closes the request as `declined`.
- One open request per session.
- One vote per friend per request.
- Self-validation is forbidden.

## Data Contracts

- New enums:
  - `public.gym_session_validation_request_status = ('open','accepted','declined','expired')`
  - `public.gym_session_validation_decision = ('accept','decline')`
- New tables:
  - `public.gym_session_validation_requests`
    - `id`, `session_id`, `requester_user_id`, `request_message`, `status`, `expires_at`, lifecycle timestamps, `created_at`, `updated_at`
    - `request_message` is optional, trimmed, and capped at 180 chars
    - unique partial index for one open request per session
  - `public.gym_session_validation_votes`
    - `id`, `request_id`, `friend_user_id`, `decision`, `created_at`
    - unique index for one vote per friend per request
- Security:
  - request read: requester + requester close friends
  - request insert: requester only
  - vote read: vote friend + requester
  - vote insert: eligible close friend only, open request only
  - session evidence read for detail view: eligible close friends on open + non-expired requests
  - proof photo object read (`gym-proofs`): eligible close friends on open + non-expired requests; path matching normalizes legacy `proof_path` formats (bucket prefix/full URL/leading slash) to object key.
- DB workflow automation:
  - request insert trigger validates eligibility
  - vote insert trigger validates eligibility + finality
  - vote after-insert trigger applies terminal request status and session upgrade transactionally
  - vote trigger functions run as `security definer` to keep request/session row access stable under friend-side RLS
  - `public.expire_gym_session_validation_requests(...)` marks stale open requests as expired
    - expiry reasons include timeout and session-resolved stale closure
  - gym session save upserts preserve existing proof object path unless a new photo is uploaded for that day
  - proof uploads require non-empty bytes (camera base64/file fallback) before writing `proof_path`
  - verified gym-session saves invoke expiry on linked open validation requests to clear stale inbox actions immediately

## UX States

- Requester Home card (`provisional` session):
  - CTA: `Request close-friend validation`
  - request prompt supports optional note (`request_message`)
  - request state chip: `Pending friend review`, `Accepted`, `Declined`, `Expired`
- Friend inbox (`Notifications` screen):
  - gym validation request row with requester + session date + optional note preview
  - control: `Review`
- Friend detail view (`GymValidationRequestDetail`):
  - shows requester identity, optional note, reason copy, rounded distance, proof photo
  - `Accept` / `Decline` only on this screen
  - `Accept` disabled if proof photo is unavailable
  - signed proof URL is probed for downloadable image response; failures render explicit error copy (no blank image card)
  - stale request opens (already verified/expired) render a read-only `No action needed` message
- Session status behavior:
  - accepted path updates Home/Profile from `provisional` to `verified` on refresh/focus

## Analytics

Active event instrumentation for this flow:

- `gym_session_validation_requested`
- `gym_session_validation_submitted`
- `gym_session_upgraded_verified`
- `gym_session_validation_expired`

Implementation location:

- DB triggers/functions in `supabase/migrations/20260302123000_gym_session_validation_phase2.sql`.

## QA

1. Create provisional session and request validation as owner.
2. Confirm only one open request can exist for the session.
3. Confirm requester without close friends cannot create a request.
4. As eligible close friend, submit one `accept` vote and verify:
   - request status becomes `accepted`,
   - session status upgrades to `verified`,
   - `verified_at` is set.
5. As eligible close friend, submit one `decline` vote and verify request status becomes `declined`.
6. Confirm duplicate vote by same friend is blocked.
7. Confirm self-validation is blocked.
8. Confirm stale open requests transition to `expired` after 48h.
9. Confirm an open request auto-expires when owner later logs/upgrades same-day session to `verified`.
10. Confirm Home card and Notifications screen show matching request state.
11. Confirm analytics events are inserted for request, vote, upgrade, and expiry transitions.
12. Confirm proof photo loads for friend review when `gym_sessions.proof_path` is stored as object key, bucket-prefixed path, or storage URL path.
