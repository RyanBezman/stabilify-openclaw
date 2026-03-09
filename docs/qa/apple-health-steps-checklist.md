# Apple Health Steps QA Checklist

Last updated: 2026-03-09

## Goal

Validate Apple Health step tracking opt-in and Home progress rendering.

## Manual steps

1. Build and run an iOS custom dev client (not Expo Go).
2. Open `Profile settings`.
3. Confirm `Track steps` is visible under device-related toggles.
4. Enable `Track steps` and accept Health permission.
5. Tap `Save settings` and confirm save succeeds.
6. Go to `Today` and verify `Progress` shows three rings: `Weigh-ins`, `Gym sessions`, and `Steps`.
7. Confirm the `Steps` ring leaves loading state and displays a value for today.
8. Disable `Track steps`, save settings, and confirm Home shows `Steps` ring in `Off` state.
9. Re-enable `Track steps` after denying permission from iOS settings and confirm an error alert appears.

## Platform checks

1. On Android, open `Profile settings`.
2. Confirm `Track steps` helper text indicates iPhone-only support.
3. Confirm the `Track steps` toggle is disabled.
