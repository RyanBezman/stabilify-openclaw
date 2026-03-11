import { describe, expect, it } from "vitest";
import {
  getNutritionPlanViewKey,
  getWorkoutPlanViewKey,
} from "./planViewKey";
import type { NutritionPlan, WorkoutPlan } from "../types/workspaceTypes";

describe("planViewKey", () => {
  it("keeps the workout key stable across equivalent plan objects", () => {
    const firstPlan: WorkoutPlan = {
      title: "4-Day Strength",
      daysPerWeek: 4,
      notes: ["Rest on Wednesday"],
      schedule: [
        {
          dayLabel: "Day 1",
          focus: "Upper",
          items: [{ name: "Bench Press", sets: "4", reps: "6" }],
        },
      ],
    };
    const secondPlan: WorkoutPlan = {
      title: "4-Day Strength",
      daysPerWeek: 4,
      notes: ["Rest on Wednesday"],
      schedule: [
        {
          dayLabel: "Day 1",
          focus: "Upper",
          items: [{ name: "Bench Press", sets: "4", reps: "6" }],
        },
      ],
    };

    expect(getWorkoutPlanViewKey(firstPlan)).toBe(getWorkoutPlanViewKey(secondPlan));
  });

  it("changes the workout key when the displayed plan changes", () => {
    const firstPlan: WorkoutPlan = {
      title: "4-Day Strength",
      daysPerWeek: 4,
      notes: [],
      schedule: [],
    };
    const secondPlan: WorkoutPlan = {
      title: "5-Day Strength",
      daysPerWeek: 5,
      notes: [],
      schedule: [],
    };

    expect(getWorkoutPlanViewKey(firstPlan)).not.toBe(getWorkoutPlanViewKey(secondPlan));
  });

  it("keeps the nutrition key stable across equivalent plan objects", () => {
    const firstPlan: NutritionPlan = {
      title: "Cut Plan",
      dailyCaloriesTarget: 2100,
      macros: {
        proteinG: 180,
        carbsG: 200,
        fatsG: 60,
      },
      meals: [
        {
          name: "Breakfast",
          targetCalories: 500,
          items: ["Eggs", "Oats"],
        },
      ],
      notes: ["Hit protein first."],
    };
    const secondPlan: NutritionPlan = {
      title: "Cut Plan",
      dailyCaloriesTarget: 2100,
      macros: {
        proteinG: 180,
        carbsG: 200,
        fatsG: 60,
      },
      meals: [
        {
          name: "Breakfast",
          targetCalories: 500,
          items: ["Eggs", "Oats"],
        },
      ],
      notes: ["Hit protein first."],
    };

    expect(getNutritionPlanViewKey(firstPlan)).toBe(getNutritionPlanViewKey(secondPlan));
  });

  it("changes the nutrition key when the displayed plan changes", () => {
    const firstPlan: NutritionPlan = {
      title: "Cut Plan",
      dailyCaloriesTarget: 2100,
      macros: {
        proteinG: 180,
        carbsG: 200,
        fatsG: 60,
      },
      meals: [],
      notes: [],
    };
    const secondPlan: NutritionPlan = {
      title: "Maintenance Plan",
      dailyCaloriesTarget: 2500,
      macros: {
        proteinG: 180,
        carbsG: 280,
        fatsG: 70,
      },
      meals: [],
      notes: [],
    };

    expect(getNutritionPlanViewKey(firstPlan)).not.toBe(getNutritionPlanViewKey(secondPlan));
  });
});
