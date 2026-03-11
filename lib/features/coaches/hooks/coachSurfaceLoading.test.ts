import { describe, expect, it } from "vitest";
import {
  resolveCoachWorkspaceEntryState,
  shouldShowCoachCheckinsLoadingState,
  shouldShowCoachWorkspaceBlockingSkeleton,
} from "./coachSurfaceLoading";

describe("coachSurfaceLoading", () => {
  const workoutCoach = {
    specialization: "workout" as const,
    gender: "woman" as const,
    personality: "strict" as const,
    displayName: "Ruth",
    tagline: "Direct",
  };

  it("keeps the workspace on a blocking skeleton while pro hydration is still pending", () => {
    expect(
      shouldShowCoachWorkspaceBlockingSkeleton({
        viewState: "ready",
        isPro: true,
        hydrated: false,
        checkingOnboarding: false,
        hasCoach: false,
      }),
    ).toBe(true);
  });

  it("does not block the workspace after hydration and onboarding checks finish", () => {
    expect(
      shouldShowCoachWorkspaceBlockingSkeleton({
        viewState: "ready",
        isPro: true,
        hydrated: true,
        checkingOnboarding: false,
        hasCoach: true,
      }),
    ).toBe(false);
  });

  it("keeps the workspace shell visible during onboarding checks when a coach is already selected", () => {
    expect(
      shouldShowCoachWorkspaceBlockingSkeleton({
        viewState: "ready",
        isPro: true,
        hydrated: true,
        checkingOnboarding: true,
        hasCoach: true,
      }),
    ).toBe(false);
  });

  it("uses the route coach while local coach hydration is still pending", () => {
    expect(
      resolveCoachWorkspaceEntryState({
        activeCoach: null,
        routeCoach: workoutCoach,
        hydrated: false,
      }),
    ).toEqual({
      coach: workoutCoach,
      selectionHydrated: true,
    });
  });

  it("uses the route coach for explicit intake entry when no active coach is linked yet", () => {
    expect(
      resolveCoachWorkspaceEntryState({
        activeCoach: null,
        routeCoach: workoutCoach,
        hydrated: true,
        allowRouteCoachFallback: true,
      }),
    ).toEqual({
      coach: workoutCoach,
      selectionHydrated: true,
    });
  });

  it("ignores stale route coaches after hydration unless the entry flow explicitly allows them", () => {
    expect(
      resolveCoachWorkspaceEntryState({
        activeCoach: null,
        routeCoach: workoutCoach,
        hydrated: true,
      }),
    ).toEqual({
      coach: null,
      selectionHydrated: true,
    });
  });

  it("keeps weekly check-ins in a loading state while pro hydration is still pending", () => {
    expect(
      shouldShowCoachCheckinsLoadingState({
        viewState: "ready",
        isPro: true,
        hydrated: false,
      }),
    ).toBe(true);
  });

  it("does not show the check-in loading state once hydration completes", () => {
    expect(
      shouldShowCoachCheckinsLoadingState({
        viewState: "ready",
        isPro: true,
        hydrated: true,
      }),
    ).toBe(false);
  });
});
