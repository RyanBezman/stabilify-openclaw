import { describe, expect, it } from "vitest";
import {
  isNutritionIntake,
  isNutritionPlan,
  isWorkoutIntake,
  isWorkoutPlan,
  normalizeNutritionIntake,
} from "./workspaceHelpers";
import type { NutritionPlan, WorkoutIntake, WorkoutPlan } from "../types/workspaceTypes";

describe("workspaceHelpers", () => {
  it("normalizes nutrition intake numeric bounds and precision", () => {
    const normalized = normalizeNutritionIntake({
      heightCm: 111.1,
      weightKg: 250.95,
      ageYears: 14.2,
      sex: "female",
      goal: "gain",
    });

    expect(normalized).toEqual({
      heightCm: 120,
      weightKg: 250,
      ageYears: 16,
      sex: "female",
      goal: "gain",
    });
  });

  it("distinguishes workout and nutrition plans", () => {
    const workoutPlan: WorkoutPlan = {
      title: "4-Day Strength",
      daysPerWeek: 4,
      notes: [],
      schedule: [],
    };
    const nutritionPlan: NutritionPlan = {
      title: "Lean Bulk",
      dailyCaloriesTarget: 2200,
      macros: {
        proteinG: 160,
        carbsG: 240,
        fatsG: 70,
      },
      meals: [],
      notes: [],
    };

    expect(isWorkoutPlan(workoutPlan)).toBe(true);
    expect(isWorkoutPlan(nutritionPlan)).toBe(false);
    expect(isNutritionPlan(nutritionPlan)).toBe(true);
    expect(isNutritionPlan(workoutPlan)).toBe(false);
  });

  it("distinguishes workout and nutrition intake", () => {
    const workoutIntake: WorkoutIntake = {
      goal: "strength",
      experience: "beginner",
      daysPerWeek: 5,
      sessionMinutes: 60,
      equipment: "full_gym",
      injuryNotes: "",
    };

    expect(isWorkoutIntake(workoutIntake)).toBe(true);
    expect(isWorkoutIntake({ heightCm: 175, weightKg: 75, ageYears: 30, sex: "male" })).toBe(false);
    expect(isNutritionIntake({ heightCm: 175, weightKg: 75, ageYears: 30, sex: "male" })).toBe(true);
    expect(isNutritionIntake(workoutIntake)).toBe(false);
  });
});
