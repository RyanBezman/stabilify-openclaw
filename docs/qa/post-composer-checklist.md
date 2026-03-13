# Post Composer QA Checklist

Last updated: 2026-03-13

## Goal

Verify the create-post composer stays minimal while supporting explicit per-post audience selection.

## Policy Rules

- The composer should keep the keyboard active during normal editing.
- Audience selection should happen inline from the composer via a bottom sheet.
- Public accounts may choose `Everyone`, `Followers`, `Close friends`, or `Only me`.
- Private accounts may choose `Followers`, `Close friends`, or `Only me`.

## Data Contracts

- Composer defaults should resolve from `profiles.post_share_visibility` when available.
- Composer publishes to `posts.visibility` using the selected audience.
- Public selection should degrade to `followers` if the author account is not public.

## UX States

- The composer uses an open text canvas instead of nested cards.
- The audience row sits above the composer action strip and opens a bottom sheet.
- The audience sheet keeps the compose context visible behind it.
- Attached photos render inline beneath the text area.

## Analytics

- No analytics validation is required for this checklist.

## QA

1. Open `Create post` and confirm the keyboard is already open.
2. Tap outside the text input, scroll the composer, and confirm the keyboard stays open.
3. Tap the audience row and confirm a bottom sheet opens over the composer instead of navigating away.
4. Swipe the audience sheet downward and confirm it dismisses.
5. Confirm the sheet lists `Followers`, `Close friends`, and `Only me` for a private account.
6. Confirm the sheet also lists `Everyone` for a public account.
7. Change the audience selection and confirm the row label updates immediately after the sheet closes.
8. Create one post with `Close friends` selected and confirm the resulting post renders the `Close friends` visibility badge.
9. Create one post with `Followers` selected and confirm the resulting post renders the `Followers` visibility badge.
10. On a public account, create one post with `Everyone` selected and confirm the resulting post renders the `Public` visibility badge.
11. On an account whose default post visibility is `Only me`, open the composer and confirm the audience row defaults to `Only you can see this`.
12. Add photos, reopen the audience picker, and confirm the keyboard/composer context remains usable after dismissing the sheet.
