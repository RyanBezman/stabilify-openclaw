import type { NutritionPlan, WorkoutPlan } from "../types/workspaceTypes";

export function getWorkoutPlanViewKey(plan: WorkoutPlan | null): string {
  if (!plan) {
    return "none";
  }

  return JSON.stringify([
    plan.title,
    plan.daysPerWeek,
    plan.notes,
    plan.schedule.map((day) => [
      day.dayLabel,
      day.focus,
      day.items.map((item) => [item.name, item.sets, item.reps]),
    ]),
  ]);
}

export function getNutritionPlanViewKey(plan: NutritionPlan | null): string {
  if (!plan) {
    return "none";
  }

  return JSON.stringify([
    plan.title,
    plan.dailyCaloriesTarget,
    [plan.macros.proteinG, plan.macros.carbsG, plan.macros.fatsG],
    plan.meals.map((meal) => [meal.name, meal.targetCalories, meal.items]),
    plan.notes,
  ]);
}
