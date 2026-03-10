# Apple Health Steps QA Checklist

Last updated: 2026-03-10

## Goal

Validate Apple Health step tracking opt-in and Home progress rendering across filter ranges.

## Manual steps

1. Build and run an iOS custom dev client (not Expo Go).
2. Open `Profile settings`.
3. Confirm `Track steps` is visible under device-related toggles.
4. Enable `Track steps` and accept Health permission.
5. Tap `Save settings` and confirm save succeeds.
6. Go to `Today` and verify `Progress` shows three rings: `Weigh-ins`, `Gym sessions`, and `Steps`.
7. Leave the filter on `Last 7 days` and confirm the `Steps` ring leaves loading state and displays today's value.
8. Switch the filter to `Last 3 months` and confirm the `Steps` ring changes to average daily steps for that selected window.
9. Change `Daily step goal` in Profile Settings, save, and confirm Home still reflects the new saved target in the Steps ring progress.
10. Disable `Track steps`, save settings, and confirm Home shows `Steps` ring in `Off` state with `Enable`.
11. Tap the disabled Steps ring on Home and confirm it opens Profile Settings.
12. Re-enable `Track steps` after denying permission from iOS settings and confirm an error alert appears.

## Platform checks

1. On Android, open `Profile settings`.
2. Confirm `Track steps` helper text indicates iPhone-only support.
3. Confirm the `Track steps` toggle is disabled.
4. Confirm `Daily step goal` remains editable and saves without enabling Apple Health.
