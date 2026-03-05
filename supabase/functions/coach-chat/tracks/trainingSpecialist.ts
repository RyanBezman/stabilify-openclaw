import type { ArtifactDiffPatch, ArtifactWeeklyCheckinInputV2 } from "../schemas.ts";

export type TrainingSpecialistResult = {
  workoutDiff: ArtifactDiffPatch[];
  rationale: string;
  focusHabit: string;
  highVolumeTraining: boolean;
};

export function generateTrainingDiff(args: {
  checkin: ArtifactWeeklyCheckinInputV2;
}): TrainingSpecialistResult {
  const { checkin } = args;
  const workoutDiff: ArtifactDiffPatch[] = [];

  if (checkin.trainingDifficulty === "too_hard") {
    workoutDiff.push({
      op: "replace",
      path: "/progression/intensity_delta_pct",
      value: -5,
    });
  }

  if (checkin.trainingDifficulty === "too_easy") {
    workoutDiff.push({
      op: "replace",
      path: "/progression/intensity_delta_pct",
      value: 3,
    });
  }

  if (checkin.injuryPain.hasPain) {
    workoutDiff.push({
      op: "add",
      path: "/substitutions/injury_aware",
      value: {
        reason: checkin.injuryPain.details || "Pain reported during weekly check-in",
      },
    });
  }

  if (checkin.scheduleConstraintsNextWeek.trim()) {
    workoutDiff.push({
      op: "add",
      path: "/constraints/next_week",
      value: checkin.scheduleConstraintsNextWeek,
    });
  }

  const highVolumeTraining = checkin.trainingDifficulty !== "too_hard" && checkin.energyRating >= 4;

  return {
    workoutDiff,
    rationale:
      checkin.trainingDifficulty === "too_hard"
        ? "Training load was tapered due to high perceived difficulty and recovery risk."
        : checkin.trainingDifficulty === "too_easy"
          ? "Training progression was nudged upward due to low perceived difficulty."
          : "Training structure remains stable with small adjustments based on schedule and recovery inputs.",
    focusHabit:
      checkin.trainingDifficulty === "too_hard"
        ? "Prioritize recovery quality and keep session intensity controlled."
        : "Complete all planned sessions with clean technique and consistent effort.",
    highVolumeTraining,
  };
}
