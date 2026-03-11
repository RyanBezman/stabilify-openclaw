import type { CoachDashboardSnapshot } from "../services/dashboard";
import type { ActiveCoach, CoachSpecialization } from "../types";

export type CoachOnboardingPlanStart = "workout" | "nutrition" | "both";
export type CoachOnboardingTrack = "workout" | "nutrition";
export type CoachOnboardingGeneratedTracks = Record<CoachOnboardingTrack, boolean>;

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

type SnapshotHydrationCandidate = {
  coach: ActiveCoach;
  specialization: CoachSpecialization;
};

const generatedByPlanStart: Record<CoachOnboardingPlanStart, CoachOnboardingGeneratedTracks> = {
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

export function buildGeneratedTracksFromPlanStart(
  planStart: CoachOnboardingPlanStart,
): CoachOnboardingGeneratedTracks {
  return {
    workout: generatedByPlanStart[planStart].workout,
    nutrition: generatedByPlanStart[planStart].nutrition,
  };
}

export function buildOnboardingResultsSnapshotCandidates(args: {
  generatedTracks: CoachOnboardingGeneratedTracks;
  workoutCoach: ActiveCoach;
  nutritionCoach: ActiveCoach;
}): SnapshotHydrationCandidate[] {
  const candidates: SnapshotHydrationCandidate[] = [];

  if (args.generatedTracks.nutrition) {
    candidates.push({
      coach: args.nutritionCoach,
      specialization: "nutrition",
    });
  }

  if (args.generatedTracks.workout) {
    candidates.push({
      coach: args.workoutCoach,
      specialization: "workout",
    });
  }

  return candidates;
}

export async function hydrateOnboardingResultsSnapshot(args: {
  generatedTracks: CoachOnboardingGeneratedTracks;
  workoutCoach: ActiveCoach;
  nutritionCoach: ActiveCoach;
  loadSnapshot: (options: {
    coach?: ActiveCoach | null;
    specialization?: "workout" | "nutrition";
  }) => Promise<CoachDashboardSnapshot>;
}): Promise<{ snapshot: CoachDashboardSnapshot | null; error: string | null }> {
  const candidates = buildOnboardingResultsSnapshotCandidates({
    generatedTracks: args.generatedTracks,
    workoutCoach: args.workoutCoach,
    nutritionCoach: args.nutritionCoach,
  });

  if (candidates.length === 0) {
    return {
      snapshot: null,
      error: null,
    };
  }

  let lastError: string | null = null;
  for (const candidate of candidates) {
    try {
      const snapshot = await args.loadSnapshot({
        coach: candidate.coach,
        specialization: candidate.specialization,
      });

      return {
        snapshot,
        error: null,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Couldn't load your results.";
    }
  }

  return {
    snapshot: null,
    error: lastError ?? "Couldn't load your results.",
  };
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
  generatedTracks: CoachOnboardingGeneratedTracks,
  snapshot: CoachDashboardSnapshot | null,
): CoachOnboardingResultTrack[] {
  const workoutGenerated = generatedTracks.workout;
  const nutritionGenerated = generatedTracks.nutrition;

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
