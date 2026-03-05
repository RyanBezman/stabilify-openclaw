export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  cta?: "review_draft_plan";
  // Present while we are syncing from Supabase; UI should not depend on it.
  createdAt?: string;
};

export type WorkoutPlan = {
  title: string;
  daysPerWeek: number;
  notes: string[];
  schedule: Array<{
    dayLabel: string;
    focus: string;
    items: Array<{ name: string; sets: string; reps: string }>;
  }>;
};

export type WorkoutIntake = {
  goal: "strength" | "fat_loss" | "recomp";
  experience: "beginner" | "intermediate" | "advanced";
  daysPerWeek: number; // 1-7
  sessionMinutes: 30 | 45 | 60 | 75;
  equipment: "full_gym" | "home_basic";
  injuryNotes: string;
};

export type NutritionGoal = "lose" | "maintain" | "gain";

export type NutritionPlan = {
  title: string;
  dailyCaloriesTarget: number;
  macros: {
    proteinG: number;
    carbsG: number;
    fatsG: number;
  };
  meals: Array<{
    name: string;
    targetCalories: number;
    items: string[];
  }>;
  notes: string[];
};

export type NutritionIntake = {
  heightCm: number;
  weightKg: number;
  ageYears: number;
  sex: "male" | "female";
  goal?: NutritionGoal;
};

export type CoachPlan = WorkoutPlan | NutritionPlan;
export type CoachIntake = WorkoutIntake | NutritionIntake;

// Backward-compatible aliases for current workout screens/components.
export type PlanIntake = WorkoutIntake;

export type PlanStatus = "none" | "draft" | "active";

export type WorkspaceTab = "plan" | "chat";
