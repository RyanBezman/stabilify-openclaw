import { describe, expect, it } from "vitest";
import type { CoachDashboardSnapshot } from "../services/dashboard";
import { buildOnboardingResultTracks, wasTrackGenerated } from "./results";

const snapshot: CoachDashboardSnapshot = {
  today: {
    directive: "Stay consistent today.",
    statusIndicators: ["Workout", "Nutrition"],
    primaryCta: "Chat with Coach",
  },
  training: {
    label: "Training",
    preview: "4-day split",
    cta: "View plan",
    planId: "plan-workout-1",
    planVersion: 1,
  },
  nutrition: {
    label: "Nutrition",
    preview: "1900 kcal",
    targetsSummary: "1900 kcal / 140g protein",
    caloriesTarget: 1900,
    cta: "View meal plan",
    ctas: ["Log meal", "View meal plan"],
    planId: "plan-nutrition-1",
    planVersion: 1,
    planUpdatedForReview: false,
  },
  weeklyCheckin: {
    label: "Weekly Check-in",
    nextDueLabel: "Sunday",
    isDue: false,
    streak: 2,
    adherenceScore: 80,
    planAcceptedThisWeek: true,
    nextWeekAdherenceDelta: 1.2,
    cta: "Preview check-in",
  },
};

describe("onboarding results helper", () => {
  it("marks both tracks generated when planStart is both", () => {
    const tracks = buildOnboardingResultTracks("both", snapshot);

    expect(tracks[0]).toMatchObject({
      track: "workout",
      generated: true,
      openIntake: false,
      ctaLabel: "View training plan",
    });
    expect(tracks[1]).toMatchObject({
      track: "nutrition",
      generated: true,
      openIntake: false,
      ctaLabel: "View nutrition plan",
    });
  });

  it("marks only workout generated when planStart is workout", () => {
    const tracks = buildOnboardingResultTracks("workout", snapshot);

    expect(tracks[0]).toMatchObject({
      track: "workout",
      generated: true,
      openIntake: false,
    });
    expect(tracks[1]).toMatchObject({
      track: "nutrition",
      generated: false,
      openIntake: true,
      ctaLabel: "Create nutrition plan",
    });
  });

  it("marks only nutrition generated when planStart is nutrition", () => {
    const tracks = buildOnboardingResultTracks("nutrition", snapshot);

    expect(tracks[0]).toMatchObject({
      track: "workout",
      generated: false,
      openIntake: true,
      ctaLabel: "Create training plan",
    });
    expect(tracks[1]).toMatchObject({
      track: "nutrition",
      generated: true,
      openIntake: false,
    });
  });

  it("exposes generated-state helper", () => {
    expect(wasTrackGenerated("both", "workout")).toBe(true);
    expect(wasTrackGenerated("both", "nutrition")).toBe(true);
    expect(wasTrackGenerated("workout", "nutrition")).toBe(false);
    expect(wasTrackGenerated("nutrition", "workout")).toBe(false);
  });
});
