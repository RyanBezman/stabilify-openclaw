import type { CoachGender, CoachPersonality } from "../types";
import { feetInchesToCm, lbToKg } from "../../../utils/bodyMetrics";

export type CoachOnboardingGoal = "lose" | "maintain" | "gain";
export type CoachExperienceLevel = "beginner" | "intermediate" | "advanced";
export type CoachEquipmentAccess = "bodyweight" | "dumbbells" | "full_gym" | "home_gym" | "mixed";

export type CoachOnboardingDraft = {
  goal: {
    primary: CoachOnboardingGoal;
    targetRatePctPerWeek: number | null;
    targetDate: string | null;
  };
  experienceLevel: CoachExperienceLevel;
  body: {
    weightKg: number | null;
    heightCm: number | null;
    age: number | null;
    sex: "male" | "female" | "other" | null;
  };
  training: {
    daysPerWeek: number;
    sessionMinutes: 30 | 45 | 60 | 75;
    equipmentAccess: CoachEquipmentAccess;
    notes: string;
  };
  nutrition: {
    dietaryPreferences: string[];
    dietaryRestrictions: string[];
  };
  constraints: {
    injuriesLimitations: string[];
    scheduleConstraintsNote: string;
  };
  persona: {
    gender: CoachGender;
    personality: CoachPersonality;
  };
  planStart: "workout" | "nutrition" | "both";
};

export type CoachOnboardingStepId =
  | "goal"
  | "experience"
  | "schedule"
  | "equipment"
  | "nutrition"
  | "constraints"
  | "sex"
  | "weight"
  | "height"
  | "persona"
  | "plan_start"
  | "review";

export const COACH_ONBOARDING_STEPS: CoachOnboardingStepId[] = [
  "goal",
  "experience",
  "schedule",
  "equipment",
  "nutrition",
  "constraints",
  "sex",
  "weight",
  "height",
  "persona",
  "plan_start",
  "review",
];

export function createInitialCoachOnboardingDraft(): CoachOnboardingDraft {
  return {
    goal: { primary: "maintain", targetRatePctPerWeek: null, targetDate: null },
    experienceLevel: "beginner",
    body: { weightKg: lbToKg(170), heightCm: feetInchesToCm(5, 5), age: null, sex: null },
    training: {
      daysPerWeek: 4,
      sessionMinutes: 45,
      equipmentAccess: "full_gym",
      notes: "",
    },
    nutrition: {
      dietaryPreferences: ["high_protein", "simple_meals"],
      dietaryRestrictions: [],
    },
    constraints: {
      injuriesLimitations: [],
      scheduleConstraintsNote: "",
    },
    persona: {
      gender: "woman",
      personality: "sweet",
    },
    planStart: "both",
  };
}
