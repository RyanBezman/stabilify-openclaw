# Profile Settings QA Checklist

Last updated: 2026-03-10

## Goal

Validate the Profile Settings flow with drill-in text editing.

## Policy Rules

- Main settings preferences save immediately.
- Text fields open dedicated editor screens from the main settings screen.
- No bottom `Save settings` button is present.
- The screen should follow the shared full-width dark social-surface style used by `Profile` and `Feed`.

## Data Contracts

- Profile Settings reads via `fetchProfileSettingsValues`.
- Profile Settings writes via `saveProfileSettingsValues` and settings-specific RPCs where required.

## UX States

- Text fields are opened from the main screen and edited on a dedicated screen.
- Switches and option pills persist immediately after interaction.
- Failed text saves keep the user on the editor screen and show an alert.
- The layout uses edge-to-edge grouped sections and subtle dividers instead of deeply nested cards.
- The top avatar shows the current profile photo when available and otherwise falls back to initials.
- The text editor screen remains usable while the keyboard is open.
- iPhone numeric steps entry should expose a keyboard dismissal control.
- Helper text remains sparse and should only appear where it materially helps the user.

## Analytics

- No analytics validation is required for this checklist.

## QA

1. Open `Profile Settings` and confirm there is no bottom `Save settings` button.
2. Tap `Name`, confirm a dedicated edit screen opens, save a new value, and confirm the row updates after returning.
3. Repeat step 2 for `Username`, `Bio`, `Timezone`, and `Daily step goal`.
4. Make a text change, back out without saving, and confirm the screen prompts before discarding the edit.
5. Confirm the overall main-screen presentation is full-width and clean, with grouped rows and subtle dividers rather than stacked nested cards.
6. Confirm the hero avatar shows the saved profile photo; if no photo exists, confirm initials render from first name and last name when present.
7. On iPhone, open each text editor and confirm the keyboard keeps the input usable without layout glitches.
8. On iPhone, confirm the keyboard accessory dismissal control appears while editing `Steps`.
9. Confirm `Username`, `Timezone`, and `Steps` do not show unnecessary helper copy on the main settings screen.
10. Confirm the styling feels visually aligned with `Profile` and `Feed` instead of a separate dashboard/admin surface.
11. Change preferred unit and confirm the selected pill persists after leaving and reopening the screen.
12. Toggle `Show Progress on public profile` and confirm the switch state persists after reopening the screen.
13. Toggle `Phone notifications` on and off and confirm the state reflects the device registration result.
14. Toggle `Track steps` on and off and confirm the setting persists.
15. Toggle `Auto support post` off and confirm it stays off after reopening the screen.
16. Toggle `Auto support post` on and confirm consent is still required before the setting stays on.
17. After the screen has loaded once, switch to another tab and back. Confirm the existing rows, avatar, and section content stay mounted during refresh instead of showing a full-screen blocking loader.
18. With existing settings visible, trigger a refresh path (tab revisit or pull-to-refresh if available) and confirm in-flight updates do not clear the current snapshot before the refreshed values land.
