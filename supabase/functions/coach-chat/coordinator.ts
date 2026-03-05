import {
  normalizeCoachMessageArtifact,
  normalizeWeeklyCheckinArtifact,
  type ArtifactCoachMessage,
  type ArtifactWeeklyCheckinInputV2,
} from "./schemas.ts";
import { generateTrainingDiff } from "./tracks/trainingSpecialist.ts";
import { generateNutritionDiff } from "./tracks/nutritionSpecialist.ts";
import {
  enforceCoordinatorConsistency,
  enforceNutritionGuardrails,
  enforceTrainingGuardrails,
} from "./guardrails.ts";
import { reconcileCoordinatorOutput } from "./reconcile.ts";

export type CoordinatorInput = {
  checkin: unknown;
  currentDailyCalories?: number | null;
  currentMacros?: { proteinG: number; carbsG: number; fatsG: number } | null;
  currentMeals?: Array<{ name: string; targetCalories: number; items?: string[] }> | null;
  estimatedTdee?: number | null;
  latestScaleWeightKg?: number | null;
};

export type CoordinatorOutput = {
  normalizedCheckin: ArtifactWeeklyCheckinInputV2;
  coachMessage: ArtifactCoachMessage;
  recommendations: ReturnType<typeof reconcileCoordinatorOutput>["recommendations"];
  guardrailNotes: string[];
};

export function routeCheckinToTracks(raw: CoordinatorInput): CoordinatorOutput {
  const normalizedCheckin = normalizeWeeklyCheckinArtifact(raw.checkin);

  const training = generateTrainingDiff({
    checkin: normalizedCheckin,
  });

  const nutrition = generateNutritionDiff({
    checkin: normalizedCheckin,
    currentDailyCalories: raw.currentDailyCalories,
    currentMacros: raw.currentMacros,
    currentMeals: raw.currentMeals,
    estimatedTdee: raw.estimatedTdee,
    latestScaleWeightKg: raw.latestScaleWeightKg,
  });

  const trainingGuardrail = enforceTrainingGuardrails({
    checkin: normalizedCheckin,
  });
  const nutritionGuardrail = enforceNutritionGuardrails({
    targetCalories: raw.currentDailyCalories,
    estimatedTdee: raw.estimatedTdee,
    mentionsMedicalCondition: normalizedCheckin.injuryPain.redFlags,
  });
  const consistencyGuardrail = enforceCoordinatorConsistency({
    highVolumeTraining: training.highVolumeTraining,
    largeCalorieDeficit: nutrition.largeCalorieDeficit,
  });

  const hasTightenDeficitAdjustment = nutrition.nutritionDiff.some(
    (patch) =>
      patch.path === "/dailyCaloriesTarget"
      && Number.isFinite(raw.currentDailyCalories)
      && Number.isFinite(patch.value)
      && Number(patch.value) < Number(raw.currentDailyCalories)
  );
  const hasEaseDeficitAdjustment = nutrition.nutritionDiff.some(
    (patch) =>
      patch.path === "/dailyCaloriesTarget"
      && Number.isFinite(raw.currentDailyCalories)
      && Number.isFinite(patch.value)
      && Number(patch.value) > Number(raw.currentDailyCalories)
  );
  const safetyEscalation = trainingGuardrail.escalation || nutritionGuardrail.escalation;

  const summary = [
    "We reviewed your weekly check-in across training and nutrition.",
    hasTightenDeficitAdjustment
      ? "Your reported check-in weight is above your latest logged scale trend, so we tightened next-week nutrition targets."
      : hasEaseDeficitAdjustment
        ? "Adherence signals were lower, so nutrition targets were adjusted to be easier to sustain next week."
        : "Your next-week plan has been tuned for adherence, recovery, and steady progress.",
    safetyEscalation
      ? "Safety signals were detected, so adjustments stayed conservative and you should consult a qualified professional if symptoms persist."
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const reconciliation = reconcileCoordinatorOutput({
    workoutDiff: training.workoutDiff,
    nutritionDiff: nutrition.nutritionDiff,
    mealPlanDiff: nutrition.mealPlanDiff,
    rationale: {
      training: training.rationale,
      nutrition: nutrition.rationale,
      coordination: [
        ...trainingGuardrail.warnings,
        ...nutritionGuardrail.warnings,
        ...consistencyGuardrail.warnings,
      ].join(" ") || "No cross-track conflicts detected.",
    },
    summary,
    focusHabits: [training.focusHabit, nutrition.focusHabit].filter(Boolean),
  });

  const coachMessage = normalizeCoachMessageArtifact(reconciliation.coachMessage);

  return {
    normalizedCheckin,
    recommendations: reconciliation.recommendations,
    coachMessage,
    guardrailNotes: [
      ...trainingGuardrail.warnings,
      ...nutritionGuardrail.warnings,
      ...consistencyGuardrail.warnings,
      ...(trainingGuardrail.escalation ? [trainingGuardrail.escalation] : []),
      ...(nutritionGuardrail.escalation ? [nutritionGuardrail.escalation] : []),
    ],
  };
}

export function buildUnifiedCoachMessage(args: {
  summary: string;
  focusHabits: string[];
  artifactRefs?: ArtifactCoachMessage["artifactRefs"];
}): ArtifactCoachMessage {
  return normalizeCoachMessageArtifact({
    id: crypto.randomUUID(),
    voice: "unified_primary_coach",
    summary: args.summary,
    focusHabits: args.focusHabits,
    artifactRefs: args.artifactRefs,
    createdAt: new Date().toISOString(),
  });
}
