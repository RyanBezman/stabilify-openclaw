import { describe, expect, it } from "vitest";
import type { CoachDashboardSnapshot } from "../services/dashboard";
import {
  buildOnboardingResultsSnapshotCandidates,
  buildGeneratedTracksFromPlanStart,
  buildOnboardingResultTracks,
  hydrateOnboardingResultsSnapshot,
  wasTrackGenerated,
} from "./results";
import type { ActiveCoach } from "../types";

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

const workoutCoach: ActiveCoach = {
  specialization: "workout",
  gender: "woman",
  personality: "strict",
  displayName: "Ruth",
  tagline: "Direct",
};

const nutritionCoach: ActiveCoach = {
  specialization: "nutrition",
  gender: "woman",
  personality: "strict",
  displayName: "Ruth",
  tagline: "Direct",
};

describe("onboarding results helper", () => {
  it("marks both tracks generated when planStart is both", () => {
    const tracks = buildOnboardingResultTracks(
      buildGeneratedTracksFromPlanStart("both"),
      snapshot,
    );

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
    const tracks = buildOnboardingResultTracks(
      buildGeneratedTracksFromPlanStart("workout"),
      snapshot,
    );

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
    const tracks = buildOnboardingResultTracks(
      buildGeneratedTracksFromPlanStart("nutrition"),
      snapshot,
    );

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

  it("allows partial generation state to override the requested plan start", () => {
    const tracks = buildOnboardingResultTracks(
      {
        workout: true,
        nutrition: false,
      },
      snapshot,
    );

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

  it("falls back to workout snapshot loading when nutrition results are unavailable", async () => {
    const loadSnapshot = async (args: {
      coach?: ActiveCoach | null;
      specialization?: "workout" | "nutrition";
    }) => {
      if (args.specialization === "nutrition") {
        throw new Error("Nutrition snapshot unavailable.");
      }

      return snapshot;
    };

    const result = await hydrateOnboardingResultsSnapshot({
      generatedTracks: {
        workout: true,
        nutrition: true,
      },
      workoutCoach,
      nutritionCoach,
      loadSnapshot,
    });

    expect(result).toEqual({
      snapshot,
      error: null,
    });
  });

  it("skips nutrition snapshot candidates when nutrition was not generated", () => {
    expect(
      buildOnboardingResultsSnapshotCandidates({
        generatedTracks: {
          workout: true,
          nutrition: false,
        },
        workoutCoach,
        nutritionCoach,
      }),
    ).toEqual([
      {
        coach: workoutCoach,
        specialization: "workout",
      },
    ]);
  });
});
