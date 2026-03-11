import { describe, expect, it } from "vitest";
import { deriveWorkspacePlanView } from "./workspacePlanView";
import type {
  NutritionIntake,
  NutritionPlan,
  WorkoutIntake,
  WorkoutPlan,
} from "../types/workspaceTypes";

const workoutPlan: WorkoutPlan = {
  title: "4-Day Strength",
  daysPerWeek: 4,
  notes: [],
  schedule: [],
};

const workoutDraftPlan: WorkoutPlan = {
  title: "5-Day Strength",
  daysPerWeek: 5,
  notes: [],
  schedule: [],
};

const nutritionPlan: NutritionPlan = {
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

const workoutIntake: WorkoutIntake = {
  goal: "strength",
  experience: "intermediate",
  daysPerWeek: 4,
  sessionMinutes: 60,
  equipment: "full_gym",
  injuryNotes: "",
};

const nutritionIntake: NutritionIntake = {
  heightCm: 180,
  weightKg: 82,
  ageYears: 31,
  sex: "male",
};

describe("deriveWorkspacePlanView", () => {
  it("prefers the draft plan when explicitly showing it", () => {
    const view = deriveWorkspacePlanView({
      activePlan: workoutPlan,
      defaultNutritionGoal: "maintain",
      draftPlan: workoutDraftPlan,
      intake: workoutIntake,
      showDraftInPlan: true,
    });

    expect(view.displayedPlanKind).toBe("new");
    expect(view.displayedWorkoutPlan?.title).toBe("5-Day Strength");
    expect(view.workoutActivePlan?.title).toBe("4-Day Strength");
    expect(view.workoutDraftPlan?.title).toBe("5-Day Strength");
    expect(view.hasAnyPlan).toBe(true);
    expect(view.hasToggle).toBe(true);
    expect(view.planBadge).toBe("active");
  });

  it("falls back to the default nutrition goal when intake does not set one", () => {
    const view = deriveWorkspacePlanView({
      activePlan: nutritionPlan,
      defaultNutritionGoal: "gain",
      draftPlan: null,
      intake: nutritionIntake,
      showDraftInPlan: false,
    });

    expect(view.displayedPlanKind).toBe("current");
    expect(view.displayedNutritionPlan?.title).toBe("Cut Plan");
    expect(view.nutritionActivePlan?.title).toBe("Cut Plan");
    expect(view.nutritionDraftPlan).toBeNull();
    expect(view.nutritionIntake.goal).toBe("gain");
    expect(view.planBadge).toBe("active");
  });

  it("returns none-state when no plans are present", () => {
    const view = deriveWorkspacePlanView({
      activePlan: null,
      defaultNutritionGoal: "maintain",
      draftPlan: null,
      intake: workoutIntake,
      showDraftInPlan: false,
    });

    expect(view.displayedPlanKind).toBe("none");
    expect(view.displayedWorkoutPlan).toBeNull();
    expect(view.displayedNutritionPlan).toBeNull();
    expect(view.hasAnyPlan).toBe(false);
    expect(view.hasToggle).toBe(false);
    expect(view.planBadge).toBe("none");
  });
});
