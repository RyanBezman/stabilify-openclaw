import type { CoachDashboardSnapshot } from "../services/dashboard";
import type { CoachSpecialization } from "../types";

export type CoachOnboardingPlanStart = "workout" | "nutrition" | "both";
export type CoachOnboardingTrack = "workout" | "nutrition";

export type CoachOnboardingResultTrack = {
  track: CoachOnboardingTrack;
  title: "Training" | "Nutrition";
  subtitle: string;
  generated: boolean;
  planReady: boolean;
  specialization: CoachSpecialization;
  openIntake: boolean;
  ctaLabel: string;
};

const generatedByPlanStart: Record<
  CoachOnboardingPlanStart,
  Record<CoachOnboardingTrack, boolean>
> = {
  both: { workout: true, nutrition: true },
  workout: { workout: true, nutrition: false },
  nutrition: { workout: false, nutrition: true },
};

const defaultSubtitleByTrack: Record<CoachOnboardingTrack, string> = {
  workout: "Workout plan not generated yet.",
  nutrition: "Nutrition plan not generated yet.",
};

const syncingSubtitleByTrack: Record<CoachOnboardingTrack, string> = {
  workout: "Training plan is syncing. Open to view the latest version.",
  nutrition: "Nutrition plan is syncing. Open to view the latest version.",
};

export function wasTrackGenerated(
  planStart: CoachOnboardingPlanStart,
  track: CoachOnboardingTrack,
) {
  return generatedByPlanStart[planStart][track];
}

function trackCtaLabel(args: {
  track: CoachOnboardingTrack;
  generated: boolean;
  planReady: boolean;
}) {
  if (!args.generated) {
    return args.track === "workout" ? "Create training plan" : "Create nutrition plan";
  }

  if (args.planReady) {
    return args.track === "workout" ? "View training plan" : "View nutrition plan";
  }

  return args.track === "workout" ? "Open training plan" : "Open nutrition plan";
}

export function buildOnboardingResultTracks(
  planStart: CoachOnboardingPlanStart,
  snapshot: CoachDashboardSnapshot | null,
): CoachOnboardingResultTrack[] {
  const workoutGenerated = wasTrackGenerated(planStart, "workout");
  const nutritionGenerated = wasTrackGenerated(planStart, "nutrition");

  const workoutPlanReady = workoutGenerated && Boolean(snapshot?.training.planId);
  const nutritionPlanReady = nutritionGenerated && Boolean(snapshot?.nutrition.planId);

  const workoutSubtitle = workoutPlanReady
    ? (snapshot?.training.preview ?? syncingSubtitleByTrack.workout)
    : workoutGenerated
      ? syncingSubtitleByTrack.workout
      : defaultSubtitleByTrack.workout;
  const nutritionSubtitle = nutritionPlanReady
    ? (snapshot?.nutrition.targetsSummary ?? syncingSubtitleByTrack.nutrition)
    : nutritionGenerated
      ? syncingSubtitleByTrack.nutrition
      : defaultSubtitleByTrack.nutrition;

  return [
    {
      track: "workout",
      title: "Training",
      subtitle: workoutSubtitle,
      generated: workoutGenerated,
      planReady: workoutPlanReady,
      specialization: "workout",
      openIntake: !workoutGenerated,
      ctaLabel: trackCtaLabel({
        track: "workout",
        generated: workoutGenerated,
        planReady: workoutPlanReady,
      }),
    },
    {
      track: "nutrition",
      title: "Nutrition",
      subtitle: nutritionSubtitle,
      generated: nutritionGenerated,
      planReady: nutritionPlanReady,
      specialization: "nutrition",
      openIntake: !nutritionGenerated,
      ctaLabel: trackCtaLabel({
        track: "nutrition",
        generated: nutritionGenerated,
        planReady: nutritionPlanReady,
      }),
    },
  ];
}
