export type NutritionGoal = "lose" | "maintain" | "gain";
export type NutritionSex = "male" | "female" | "other";

export type NutritionIntake = {
  heightCm: number;
  weightKg: number;
  ageYears: number;
  sex: NutritionSex;
  goal?: NutritionGoal;
};

export type NutritionTargets = {
  goal: NutritionGoal;
  dailyCaloriesTarget: number;
  macros: {
    proteinG: number;
    carbsG: number;
    fatsG: number;
  };
  activityMultiplier: number;
};

const BMR_CONSTANT_BY_SEX: Record<NutritionSex, number> = {
  male: 5,
  female: -161,
  other: -78,
};

const CALORIE_FLOOR_BY_SEX: Record<NutritionSex, number> = {
  male: 1500,
  female: 1200,
  other: 1350,
};

function activityMultiplierFromWorkoutDays(daysPerWeek: number | null) {
  if (!daysPerWeek || !Number.isFinite(daysPerWeek)) return 1.375;
  if (daysPerWeek <= 2) return 1.2;
  if (daysPerWeek <= 4) return 1.375;
  if (daysPerWeek <= 5) return 1.55;
  return 1.725;
}

export function goalFromProfileGoalType(goalType: string | null | undefined): NutritionGoal {
  if (goalType === "lose" || goalType === "gain") return goalType;
  return "maintain";
}

export function computeNutritionTargets(args: {
  intake: NutritionIntake;
  fallbackGoalType: string | null | undefined;
  workoutDaysPerWeek: number | null;
}): NutritionTargets {
  const { intake, fallbackGoalType, workoutDaysPerWeek } = args;
  const goal = intake.goal ?? goalFromProfileGoalType(fallbackGoalType);
  const activityMultiplier = activityMultiplierFromWorkoutDays(workoutDaysPerWeek);

  const bmr =
    10 * intake.weightKg +
    6.25 * intake.heightCm -
    5 * intake.ageYears +
    BMR_CONSTANT_BY_SEX[intake.sex];

  const tdee = bmr * activityMultiplier;
  const goalAdjustment = goal === "lose" ? -400 : goal === "gain" ? 300 : 0;

  let calories = Math.round((tdee + goalAdjustment) / 10) * 10;
  calories = Math.max(CALORIE_FLOOR_BY_SEX[intake.sex], calories);

  const proteinFactor = goal === "lose" ? 2.0 : 1.8;
  const fatFactor = goal === "gain" ? 1.0 : goal === "maintain" ? 0.9 : 0.8;

  const proteinG = Math.round(intake.weightKg * proteinFactor);
  let fatsG = Math.round(intake.weightKg * fatFactor);
  let carbsG = Math.round((calories - proteinG * 4 - fatsG * 9) / 4);

  if (carbsG < 60) {
    carbsG = 60;
    const remainingFatCalories = calories - proteinG * 4 - carbsG * 4;
    fatsG = Math.max(35, Math.round(remainingFatCalories / 9));
  }

  return {
    goal,
    dailyCaloriesTarget: calories,
    macros: {
      proteinG,
      carbsG: Math.max(0, carbsG),
      fatsG: Math.max(0, fatsG),
    },
    activityMultiplier,
  };
}
