import type { CoachOnboardingDraft, CoachOnboardingStepId } from "./models";

export function validateCoachOnboardingStep(step: CoachOnboardingStepId, draft: CoachOnboardingDraft): string | null {
  if (step === "stats" && !draft.body.weightKg) {
    return "Add your current weight to personalize your plan.";
  }

  if (step === "schedule") {
    if (draft.training.daysPerWeek < 1 || draft.training.daysPerWeek > 7) {
      return "Training days must be between 1 and 7.";
    }
  }

  if (step === "persona") {
    if (!["strict", "hype", "sweet"].includes(draft.persona.personality)) {
      return "Select one of the V1 coach personalities.";
    }
  }

  return null;
}

export function isCoachOnboardingComplete(draft: CoachOnboardingDraft): boolean {
  return Boolean(
    draft.goal.primary &&
      draft.experienceLevel &&
      draft.training.daysPerWeek &&
      draft.training.sessionMinutes &&
      draft.training.equipmentAccess &&
      draft.persona.gender &&
      draft.persona.personality &&
      draft.body.weightKg,
  );
}
