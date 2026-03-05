# Notifications Inbox (Actionable Requests)

Last updated: 2026-03-02

## Goal

Provide one actionable inbox entry point for pending social actions, with Home bell badge visibility and a shared Profile secondary entry.

## Policy Rules

- Notifications v1 includes only actionable requests:
  - pending follow requests,
  - open close-friend gym validation requests.
- Home header bell shows open actionable count (not unread/read state).
- Profile menu exposes the same inbox as a secondary entry.
- Gym validation requests must be reviewed in detail before vote actions are shown.

## Data Contracts

- No new notifications table in v1.
- Derived list/count sources:
  - `public.follows` where pending incoming requests exist,
  - `public.gym_session_validation_requests` where `status = 'open'` and viewer is eligible close friend.
- App data APIs:
  - `fetchActionableNotifications({ userId?, limit? })`
  - `fetchActionableNotificationCount(userId?)`
- Notification item types:
  - `follow_request`
  - `gym_validation_request`

## UX States

- Home:
  - bell icon in `AuthedHeader` with red count badge.
- Inbox screen (`FollowRequests` route, user-facing title `Notifications`):
  - unified chronological list,
  - follow requests keep inline `Accept` / `Reject`,
  - gym validation rows show `Review` CTA only.
- Gym validation detail route:
  - evidence context + decision actions (`Accept` / `Decline`).

## Analytics

- No new event names for this slice.
- Existing gym validation lifecycle events continue unchanged:
  - `gym_session_validation_requested`
  - `gym_session_validation_submitted`
  - `gym_session_upgraded_verified`
  - `gym_session_validation_expired`

## QA

1. Home bell badge equals open actionable count from follow + gym validation requests.
2. Profile menu count matches Home bell count.
3. Inbox displays mixed actionable items in newest-first order.
4. Follow request actions resolve item and decrement badge.
5. Gym validation `Review` opens detail route and does not allow inline list voting.
