import { coachPersonalityCopy } from "../models/personalityCopy";
import type { CoachOnboardingDraft, CoachOnboardingStepId } from "./models";

export function validateCoachOnboardingStep(step: CoachOnboardingStepId, draft: CoachOnboardingDraft): string | null {
  if (step === "sex" && draft.body.sex === null) {
    return "Select your sex to calibrate your nutrition plan.";
  }

  if (step === "weight" && draft.body.weightKg === null) {
    return "Add your current weight to personalize your plan.";
  }

  if (step === "height" && draft.body.heightCm === null) {
    return "Add your height so we can calibrate your plan.";
  }

  if (step === "schedule") {
    if (draft.training.daysPerWeek < 1 || draft.training.daysPerWeek > 7) {
      return "Training days must be between 1 and 7.";
    }
  }

  if (step === "persona") {
    if (!Object.prototype.hasOwnProperty.call(coachPersonalityCopy, draft.persona.personality)) {
      return "Select one of the available coach personalities.";
    }
  }

  if (step === "plan_start") {
    if (!["workout", "nutrition", "both"].includes(draft.planStart)) {
      return "Choose how you want to start with your coach.";
    }
  }

  return null;
}
