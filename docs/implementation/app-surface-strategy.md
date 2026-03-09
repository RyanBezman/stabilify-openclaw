# App Surface Implementation Strategy (Home, Feed, Profile)

Last updated: 2026-03-09

## Goal

Define implementation contracts for Home, Feed, and Profile ownership boundaries.

## Policy Rules

Policy source-of-truth:

- `docs/product/app-overview.md`
- `docs/product/accountability-and-social.md`
- `docs/product/builder-context.md`
- `docs/product/roadmap-and-governance.md`

## Surface Contracts

### Home (private execution dashboard)

Primary question: "What do I need to do today to stay on track?"

Implementation responsibilities:

- Render streak and consistency status.
- Render weigh-in trend and recent entries.
- Render weekly gym progress and proof state.
- Provide primary CTAs for weigh-in and gym logging.
- Keep gym logging on Home as an inline fixed-height flow card.
- Start gym logging at step one; camera and location permission prompts are user-initiated actions.
- Treat analyzing as explicit step 4 in the gym flow progress UI.
- Hide redundant lower gym CTA row while inline gym flow or analysis card is active.

Do not include:

- Community feed stream.
- Deep archive/history management.

### Feed (community accountability timeline)

Primary question: "Who should I support right now?"

Implementation responsibilities:

- Render social momentum stream from accountability events.
- Support lightweight social interaction model.
- Support manual text/photo posting when enabled.

Do not include:

- Dashboard analytics cards owned by Home.
- Account/settings controls owned by Profile.

### Profile (identity + personal archive)

Primary question: "What is my ongoing record?"

Implementation responsibilities:

- Render profile identity and visibility controls.
- Render user-owned archive of posts and activity.
- Surface settings entry points.

Do not include:

- Community discovery stream.
- Day-to-day execution dashboard controls.

## Content Routing Matrix

| Content type | Home | Feed | Profile | Notes |
| --- | --- | --- | --- | --- |
| Today's weigh-in CTA | Primary | No | No | Home drives completion. |
| Weekly gym target/proof status | Primary | No | Optional summary | Home owns execution. |
| Weight trend chart | Primary | No | Optional snapshot | Feed avoids dashboard UI. |
| Auto event: weigh-in milestone | Optional small badge | Yes | Yes | Avoid sensitive payload by default. |
| Auto event: gym session verified | Optional small badge | Yes | Yes | Accountability event. |
| Auto event: streak milestone | Yes | Yes | Yes | Different presentation by surface. |
| Manual text post | No | Yes | Yes | Feed = engagement, Profile = archive. |
| Manual photo post | No | Yes | Yes | Feed = engagement, Profile = archive. |
| Followers + close friends activity | No | Yes | No | Keep Home/Profile clean. |
| Profile/privacy/settings controls | No | No | Yes | Single ownership surface. |

## Data Contracts

### `public.activity_events`

- `id uuid primary key`
- `actor_user_id uuid not null`
- `event_type text not null`
- `event_date date not null`
- `source_table text null`
- `source_id uuid null`
- `payload jsonb not null default '{}'::jsonb`
- `visibility text not null`
- `created_at timestamptz not null default now()`

### `public.follows`

- `id uuid primary key`
- `follower_user_id uuid not null`
- `followed_user_id uuid not null`
- `status text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `public.close_friends`

- `id uuid primary key`
- `user_id uuid not null`
- `friend_user_id uuid not null`
- `created_at timestamptz not null default now()`

### `public.posts`

- `id uuid primary key`
- `author_user_id uuid not null`
- `post_type text not null`
- `body text null`
- `visibility text not null`
- `created_at timestamptz not null default now()`

### `public.post_media`

- `id uuid primary key`
- `post_id uuid not null references public.posts(id) on delete cascade`
- `media_kind text not null`
- `storage_path text not null`
- `width int null`
- `height int null`
- `sort_order int not null default 0`

## UX States

- Home answers daily execution needs.
- Feed answers social support/visibility needs.
- Profile answers identity/archive/settings needs.
- Feed, Profile, and Profile settings should share one visual family for social/account surfaces:
  - dark, minimal presentation with restrained chrome,
  - full-width section groups separated by subtle dividers,
  - limited nested card usage on identity/settings surfaces,
  - inline text editing and row-based settings where the task is simple,
  - simple, calm headers and spacing that feel closer to a native social product than a dashboard.
- When in doubt, Feed and Profile should feel like adjacent surfaces from the same product, and Profile settings should look like an edit extension of Profile rather than a separate admin tool.

## Analytics

- Accountability events in Feed/Profile should preserve minimal payload defaults.
- Keep event naming and payload schema aligned to `docs/analytics/event-registry.md`.

## QA

1. Home, Feed, and Profile each keep one clear ownership job.
2. No heavy analytics duplication across tabs.
3. Accountability events can flow to Feed/Profile without exposing sensitive defaults.
4. Surface behavior remains consistent with product policy docs.
5. Feed, Profile, and Profile settings stay visually aligned with the shared full-width dark social-surface treatment.
