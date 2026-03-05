import type { ArtifactAdjustmentRecommendations, ArtifactCoachMessage } from "./schemas.ts";

type ReconcileInput = {
  workoutDiff: ArtifactAdjustmentRecommendations["workoutDiff"];
  nutritionDiff: ArtifactAdjustmentRecommendations["nutritionDiff"];
  mealPlanDiff: ArtifactAdjustmentRecommendations["mealPlanDiff"];
  rationale: ArtifactAdjustmentRecommendations["rationale"];
  summary: string;
  focusHabits: string[];
};

export function reconcileCoordinatorOutput(input: ReconcileInput): {
  recommendations: ArtifactAdjustmentRecommendations;
  coachMessage: ArtifactCoachMessage;
} {
  const trimmedHabits = input.focusHabits
    .map((habit) => habit.trim())
    .filter((habit) => habit.length > 0)
    .slice(0, 3);

  const focusHabits = (trimmedHabits.length
    ? trimmedHabits
    : ["Execute your plan with steady consistency this week."]
  ) as [string] | [string, string] | [string, string, string];

  const recommendations: ArtifactAdjustmentRecommendations = {
    id: crypto.randomUUID(),
    workoutDiff: input.workoutDiff,
    nutritionDiff: input.nutritionDiff,
    mealPlanDiff: input.mealPlanDiff,
    rationale: input.rationale,
  };

  const coachMessage: ArtifactCoachMessage = {
    id: crypto.randomUUID(),
    voice: "unified_primary_coach",
    summary: input.summary.trim(),
    focusHabits,
    artifactRefs: {
      adjustmentRecommendationId: recommendations.id,
    },
    createdAt: new Date().toISOString(),
  };

  return {
    recommendations,
    coachMessage,
  };
}
