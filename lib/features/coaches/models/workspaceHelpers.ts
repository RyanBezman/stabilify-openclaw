import type {
  CoachIntake,
  CoachPlan,
  NutritionIntake,
  NutritionPlan,
  PlanIntake,
  WorkoutIntake,
  WorkoutPlan,
} from "../types/workspaceTypes";

export const defaultIntake: PlanIntake = {
  goal: "strength",
  experience: "beginner",
  daysPerWeek: 4,
  sessionMinutes: 60,
  equipment: "full_gym",
  injuryNotes: "",
};

export const defaultNutritionIntake: NutritionIntake = {
  heightCm: 175,
  weightKg: 75,
  ageYears: 30,
  sex: "male",
};

export function normalizeNutritionIntake(input: NutritionIntake): NutritionIntake {
  return {
    heightCm: Math.max(120, Math.min(230, Math.round(input.heightCm))),
    weightKg: Math.max(35, Math.min(250, Math.round(input.weightKg * 10) / 10)),
    ageYears: Math.max(16, Math.min(85, Math.round(input.ageYears))),
    sex: input.sex,
    goal: input.goal,
  };
}

export function isWorkoutPlan(plan: CoachPlan | null | undefined): plan is WorkoutPlan {
  return Boolean(plan && typeof (plan as WorkoutPlan).daysPerWeek === "number");
}

export function isNutritionPlan(plan: CoachPlan | null | undefined): plan is NutritionPlan {
  return Boolean(plan && typeof (plan as NutritionPlan).dailyCaloriesTarget === "number");
}

export function isWorkoutIntake(intake: CoachIntake | null | undefined): intake is WorkoutIntake {
  return Boolean(intake && typeof (intake as WorkoutIntake).daysPerWeek === "number");
}

export function isNutritionIntake(
  intake: CoachIntake | null | undefined,
): intake is NutritionIntake {
  return Boolean(intake && typeof (intake as NutritionIntake).heightCm === "number");
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
