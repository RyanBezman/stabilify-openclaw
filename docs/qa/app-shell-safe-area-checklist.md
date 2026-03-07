# App Shell Safe Area Checklist

Last updated: 2026-03-06

## Goal

Verify that the shared app shell paints edge-to-edge behind safe areas and that constrained screen content remains readable on compact and wide devices.

## Policy Rules

- Follow `docs/product/app-overview.md` for the shared app experience baseline.
- Follow `docs/implementation/screen-architecture.md` for screen shell ownership and safe-area behavior.

## Data Contracts

- No backend or analytics contracts change for this checklist.

## UX States

- The app background reaches the Dynamic Island area, lower home-indicator area, and left/right safe areas without flashing or exposing the navigator default background.
- Content remains inset away from unsafe regions while the background still fills the full device frame.
- Form-heavy and detail-heavy screens stay centered with readable line lengths on tablets and landscape phones instead of stretching edge-to-edge.

## Analytics

- No analytics changes.

## QA

1. Launch the app on iPhone 17 Pro (or iPhone 15 Pro) and iPhone SE (3rd generation).
Expected:
- Guest, auth, Home, Feed, Profile, and coach surfaces all paint the same dark background edge-to-edge.
- No white or default system-colored band appears above the top content near the Dynamic Island.
- No white or default system-colored band appears below the bottom content near the home indicator.

2. Navigate between stack screens and tab screens.
Expected:
- Push/pop transitions do not reveal a different background behind the screen content.
- Pull-to-refresh and scroll bounce do not expose a mismatched root background.

3. Open the keyboard on at least one auth screen and one tab screen.
Expected:
- The keyboard transition does not reveal gaps at the top or bottom safe-area regions.

4. Open the Profile menu and any bottom-sheet picker on iPhone 17 Pro (or iPhone 15 Pro).
Expected:
- The profile menu panel reaches the top and bottom of the screen while its content remains padded away from unsafe areas.
- Bottom sheets reach the home-indicator edge and keep their buttons/pickers above the safe-area inset.

5. Check one compact-width device and one wide device or simulator.
Expected:
- Auth, onboarding, check-in, billing, settings, search, and validation-detail screens remain fully usable without horizontal clipping on compact widths such as iPhone SE.
- The same screens stay centered with constrained content widths on tablets or landscape phones instead of stretching across the full screen.
