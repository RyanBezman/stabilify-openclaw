import type { CoachGender, CoachPersonality } from "../types";
import type { NutritionIntake, WorkoutIntake } from "../types/workspaceTypes";
import {
  createInitialCoachOnboardingDraft,
  type CoachEquipmentAccess,
  type CoachExperienceLevel,
  type CoachOnboardingDraft,
  type CoachOnboardingGoal,
} from "./models";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function isGoal(value: unknown): value is CoachOnboardingGoal {
  return value === "lose" || value === "maintain" || value === "gain";
}

function isExperienceLevel(value: unknown): value is CoachExperienceLevel {
  return value === "beginner" || value === "intermediate" || value === "advanced";
}

function isEquipmentAccess(value: unknown): value is CoachEquipmentAccess {
  return (
    value === "bodyweight"
    || value === "dumbbells"
    || value === "full_gym"
    || value === "home_gym"
    || value === "mixed"
  );
}

function isSex(value: unknown): value is CoachOnboardingDraft["body"]["sex"] {
  return value === "male" || value === "female" || value === "other";
}

function isCoachGender(value: unknown): value is CoachGender {
  return value === "woman" || value === "man";
}

function isCoachPersonality(value: unknown): value is CoachPersonality {
  return (
    value === "strict"
    || value === "sweet"
    || value === "relaxed"
    || value === "bubbly"
    || value === "hype"
    || value === "analyst"
  );
}

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
      notes: draft.constraints.scheduleConstraintsNote || "",
    },
    trainingNotes: draft.training.notes,
    onboardingCompletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function mapCoachUserProfileJsonToDraft(
  profile: Record<string, unknown> | null,
  overrides?: {
    gender?: CoachGender;
    personality?: CoachPersonality;
    planStart?: CoachOnboardingDraft["planStart"];
  }
): CoachOnboardingDraft {
  const draft = createInitialCoachOnboardingDraft();
  const goals = asRecord(profile?.goals);
  const schedule = asRecord(profile?.scheduleConstraints);

  if (isGoal(goals?.primary)) {
    draft.goal.primary = goals.primary;
  }
  draft.goal.targetRatePctPerWeek = asFiniteNumber(goals?.targetRatePctPerWeek);
  draft.goal.targetDate = asOptionalString(goals?.targetDate);

  if (isExperienceLevel(profile?.experienceLevel)) {
    draft.experienceLevel = profile.experienceLevel;
  }

  draft.body.heightCm = asFiniteNumber(profile?.heightCm);
  draft.body.weightKg = asFiniteNumber(profile?.weightKg);
  draft.body.age = asFiniteNumber(profile?.age);
  draft.body.sex = isSex(profile?.sex) ? profile.sex : null;

  draft.training.daysPerWeek = Math.max(
    1,
    Math.min(7, Math.round(asFiniteNumber(schedule?.trainingDaysPerWeek) ?? draft.training.daysPerWeek))
  );
  const sessionMinutes = asFiniteNumber(schedule?.sessionMinutes);
  if (sessionMinutes === 30 || sessionMinutes === 45 || sessionMinutes === 60 || sessionMinutes === 75) {
    draft.training.sessionMinutes = sessionMinutes;
  }
  if (isEquipmentAccess(profile?.equipmentAccess)) {
    draft.training.equipmentAccess = profile.equipmentAccess;
  }
  draft.training.notes = asOptionalString(profile?.trainingNotes) ?? "";

  draft.nutrition.dietaryPreferences = asStringArray(profile?.dietaryPreferences);
  draft.nutrition.dietaryRestrictions = asStringArray(profile?.dietaryRestrictions);

  draft.constraints.injuriesLimitations = asStringArray(profile?.injuriesLimitations);
  draft.constraints.scheduleConstraintsNote = asOptionalString(schedule?.notes) ?? "";

  if (isCoachGender(overrides?.gender)) {
    draft.persona.gender = overrides.gender;
  }
  if (isCoachPersonality(overrides?.personality)) {
    draft.persona.personality = overrides.personality;
  }
  if (
    overrides?.planStart === "workout"
    || overrides?.planStart === "nutrition"
    || overrides?.planStart === "both"
  ) {
    draft.planStart = overrides.planStart;
  }

  return draft;
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
