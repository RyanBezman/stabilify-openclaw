import type { NutritionIntake, WorkoutIntake } from "../types/workspaceTypes";
import type { CoachOnboardingDraft } from "./models";

export function mapDraftToCoachUserProfileJson(draft: CoachOnboardingDraft) {
  return {
    goals: {
      primary: draft.goal.primary,
      targetRatePctPerWeek: draft.goal.targetRatePctPerWeek,
      targetDate: draft.goal.targetDate,
    },
    experienceLevel: draft.experienceLevel,
    heightCm: draft.body.heightCm,
    weightKg: draft.body.weightKg,
    age: draft.body.age,
    sex: draft.body.sex,
    equipmentAccess: draft.training.equipmentAccess,
    dietaryPreferences: draft.nutrition.dietaryPreferences,
    dietaryRestrictions: draft.nutrition.dietaryRestrictions,
    injuriesLimitations: draft.constraints.injuriesLimitations,
    scheduleConstraints: {
      trainingDaysPerWeek: draft.training.daysPerWeek,
      sessionMinutes: draft.training.sessionMinutes,
      notes: draft.training.notes || draft.constraints.scheduleConstraintsNote || "",
    },
    onboardingCompletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function mapDraftToWorkoutIntake(draft: CoachOnboardingDraft): WorkoutIntake {
  return {
    goal:
      draft.goal.primary === "gain"
        ? "strength"
        : draft.goal.primary === "lose"
          ? "fat_loss"
          : "recomp",
    experience: draft.experienceLevel,
    daysPerWeek: draft.training.daysPerWeek,
    sessionMinutes: draft.training.sessionMinutes,
    equipment: draft.training.equipmentAccess === "full_gym" ? "full_gym" : "home_basic",
    injuryNotes: [
      ...draft.constraints.injuriesLimitations,
      draft.constraints.scheduleConstraintsNote.trim(),
      draft.training.notes.trim(),
    ]
      .filter(Boolean)
      .join(". "),
  };
}

export function mapDraftToNutritionIntake(draft: CoachOnboardingDraft): NutritionIntake {
  const sex =
    draft.body.sex === "female" || draft.body.sex === "other"
      ? draft.body.sex
      : "male";

  return {
    heightCm: draft.body.heightCm ?? 175,
    weightKg: draft.body.weightKg ?? 80,
    ageYears: draft.body.age ?? 30,
    sex,
    goal: draft.goal.primary,
  };
}
