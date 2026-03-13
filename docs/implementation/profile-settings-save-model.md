# Profile Settings Save Model

Last updated: 2026-03-09

## Goal

Define how Profile Settings saves user changes without a global save button.

## Policy Rules

- Profile Settings must not use a bottom-of-screen global `Save settings` button.
- Discrete preference changes save immediately when tapped or toggled.
- Freeform text fields open dedicated edit screens from the main settings list.
- Profile Settings should use a full-width edit-profile presentation:
  - simple centered header,
  - hero area shows the current profile photo when available,
  - photo fallback uses initials from first name + last name when present,
  - edge-to-edge grouped rows with subtle dividers,
  - minimal card nesting,
  - visual alignment with `Profile` and `Feed`.
- Permission- and consent-gated toggles keep their existing prompt flows:
  - phone notifications request system notification permission,
  - Apple Health step tracking requests Health access,
  - auto support keeps explicit consent confirmation before enable.
- Profile Settings should expose relationship/account safety controls such as blocked-account management and account deletion.

## Data Contracts

- `fetchProfileSettingsValues` remains the canonical read contract for Profile Settings screens.
- `fetchProfileSettingsValues` also provides the current `avatarPath` so the edit-profile hero can render the saved profile photo.
- `saveProfileSettingsValues` remains the canonical write contract for profile-backed settings fields.
- `set_phone_nudges_enabled(false)` remains the canonical disable path for phone notification device registration.
- `allow_auto_support_with_consent()` remains the canonical enable + consent write path for auto support.

## UX States

- Main `ProfileSettings` screen:
  - top hero shows the saved profile photo and supports the same profile-photo action flow as Profile,
  - text settings (`Display name`, `Bio`, `Username`, `Timezone`, `Daily step goal`) render as drill-in rows on the main screen,
  - fields are presented in full-width edit rows rather than boxed nested cards,
  - helper text is kept minimal and only shown where it materially helps editing or validation,
  - preference pills and switches save immediately,
  - relationship-safety destinations like `Blocked accounts` are exposed as grouped link rows,
  - a danger-zone `Delete account` action is exposed from the main screen with destructive confirmation,
  - no global `Save settings` button is shown.
- `ProfileSettingsTextEdit` screen:
  - loads the latest saved profile settings before editing a field,
  - focuses a single text input for the selected field,
  - saves from the dedicated screen and returns to the main settings screen on success,
  - prompts before discarding unsaved changes when the user backs out,
  - keeps the iPhone step-goal keyboard dismissal accessory for numeric entry,
  - limits step-goal typing to 5 digits (`99999` max typed input).

## Analytics

- No analytics events change in this update.

## QA

1. Confirm the main Profile Settings screen no longer shows a global `Save settings` button.
2. Confirm tapping each text row opens a dedicated editor screen for that field.
3. Confirm saving from the dedicated text editor returns to Profile Settings and shows the updated value in the row.
4. Confirm failed text saves keep the user on the edit screen and show an error alert.
5. Confirm backing out of a dirty text editor prompts to discard unsaved changes.
6. Confirm the main screen still uses full-width grouped rows with subtle dividers instead of stacked nested cards.
7. Confirm the hero uses the saved profile photo when one exists, otherwise falls back to first-name/last-name initials.
8. Confirm the dedicated editor focuses the field cleanly and stays usable with the keyboard open on iPhone.
9. Confirm iPhone `Steps` entry shows an in-keyboard accessory action that dismisses the keyboard cleanly.
10. Confirm the header and section styling feel visually consistent with the app's `Profile` and `Feed` surfaces.
11. Confirm changing preferred unit saves immediately and persists after leaving/re-entering the screen.
12. Confirm changing profile visibility saves immediately and updates dependent share defaults.
13. Confirm disabling auto support saves immediately without requiring a second action.
14. Confirm enabling auto support still requires consent confirmation before saving.
15. Confirm Profile Settings includes a `Blocked accounts` drill-in row.
16. Confirm Profile Settings includes a danger-zone `Delete account` action with destructive confirmation copy.
