import { describe, expect, it } from "vitest";
import { computeNutritionTargets } from "./nutritionTargets";

describe("computeNutritionTargets", () => {
  it("applies sex-specific calorie floors including `other`", () => {
    const male = computeNutritionTargets({
      intake: {
        heightCm: 120,
        weightKg: 35,
        ageYears: 85,
        sex: "male",
        goal: "maintain",
      },
      fallbackGoalType: null,
      workoutDaysPerWeek: 1,
    });

    const female = computeNutritionTargets({
      intake: {
        heightCm: 120,
        weightKg: 35,
        ageYears: 85,
        sex: "female",
        goal: "maintain",
      },
      fallbackGoalType: null,
      workoutDaysPerWeek: 1,
    });

    const other = computeNutritionTargets({
      intake: {
        heightCm: 120,
        weightKg: 35,
        ageYears: 85,
        sex: "other",
        goal: "maintain",
      },
      fallbackGoalType: null,
      workoutDaysPerWeek: 1,
    });

    expect(male.dailyCaloriesTarget).toBe(1500);
    expect(female.dailyCaloriesTarget).toBe(1200);
    expect(other.dailyCaloriesTarget).toBe(1350);
  });

  it("keeps `other` calorie target between male and female for same intake", () => {
    const male = computeNutritionTargets({
      intake: {
        heightCm: 180,
        weightKg: 90,
        ageYears: 30,
        sex: "male",
        goal: "maintain",
      },
      fallbackGoalType: null,
      workoutDaysPerWeek: 4,
    });

    const female = computeNutritionTargets({
      intake: {
        heightCm: 180,
        weightKg: 90,
        ageYears: 30,
        sex: "female",
        goal: "maintain",
      },
      fallbackGoalType: null,
      workoutDaysPerWeek: 4,
    });

    const other = computeNutritionTargets({
      intake: {
        heightCm: 180,
        weightKg: 90,
        ageYears: 30,
        sex: "other",
        goal: "maintain",
      },
      fallbackGoalType: null,
      workoutDaysPerWeek: 4,
    });

    expect(other.dailyCaloriesTarget).toBeLessThan(male.dailyCaloriesTarget);
    expect(other.dailyCaloriesTarget).toBeGreaterThan(female.dailyCaloriesTarget);
  });

  it("falls back to profile goal type when intake goal is omitted", () => {
    const result = computeNutritionTargets({
      intake: {
        heightCm: 175,
        weightKg: 75,
        ageYears: 30,
        sex: "other",
      },
      fallbackGoalType: "gain",
      workoutDaysPerWeek: 4,
    });

    expect(result.goal).toBe("gain");
  });
});
