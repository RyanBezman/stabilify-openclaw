import type { ArtifactWeeklyCheckinInputV2 } from "./schemas.ts";

export type GuardrailResult = {
  warnings: string[];
  escalation: string | null;
};

export function enforceTrainingGuardrails(input: {
  checkin: ArtifactWeeklyCheckinInputV2;
  requestedLoadJumpPct?: number;
}): GuardrailResult {
  const warnings: string[] = [];
  let escalation: string | null = null;

  if (typeof input.requestedLoadJumpPct === "number" && input.requestedLoadJumpPct > 10) {
    warnings.push("Capped training progression to <=10% weekly load increase.");
  }

  if (input.checkin.injuryPain.hasPain) {
    warnings.push("Applied injury-aware exercise substitutions and conservative intensity.");
  }

  if (input.checkin.injuryPain.redFlags) {
    escalation = "Serious pain or medical red-flag signals detected; advise professional evaluation before continuing high-load training.";
  }

  return { warnings, escalation };
}

export function enforceNutritionGuardrails(input: {
  targetCalories?: number | null;
  estimatedTdee?: number | null;
  mentionsMedicalCondition?: boolean;
}): GuardrailResult {
  const warnings: string[] = [];
  let escalation: string | null = null;

  const targetCalories = input.targetCalories ?? null;
  const estimatedTdee = input.estimatedTdee ?? null;

  if (Number.isFinite(targetCalories) && Number.isFinite(estimatedTdee) && targetCalories && estimatedTdee) {
    const deficitPct = ((estimatedTdee - targetCalories) / estimatedTdee) * 100;
    if (deficitPct > 20) {
      warnings.push("Reduced calorie deficit to stay within a safer <=20% range.");
    }
  }

  if (input.mentionsMedicalCondition) {
    escalation = "Potential medical nutrition scope detected; recommend consultation with a licensed professional.";
  }

  return { warnings, escalation };
}

export function enforceCoordinatorConsistency(input: {
  highVolumeTraining: boolean;
  largeCalorieDeficit: boolean;
}): GuardrailResult {
  const warnings: string[] = [];
  if (input.highVolumeTraining && input.largeCalorieDeficit) {
    warnings.push("Adjusted recommendations to avoid pairing high training volume with an aggressive calorie deficit.");
  }

  return {
    warnings,
    escalation: null,
  };
}
