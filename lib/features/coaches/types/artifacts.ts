export type ArtifactDiffOp = "add" | "remove" | "replace";

export type ArtifactDiffPatch = {
  op: ArtifactDiffOp;
  path: string;
  value?: unknown;
};

export namespace CoachArtifacts {
  export type UserProfile = {
    userId: string;
    goals: {
      primary: "fat_loss" | "muscle_gain" | "recomp" | "performance" | "maintain";
      targetRatePctPerWeek?: number | null;
      targetDate?: string | null;
    };
    experienceLevel: "beginner" | "intermediate" | "advanced";
    heightCm: number;
    weightKg: number;
    age: number;
    sex: "male" | "female" | "other";
    equipmentAccess: "full_gym" | "home_basic" | "dumbbells" | "bodyweight";
    dietaryPreferences: string[];
    dietaryRestrictions: string[];
    injuriesLimitations: string[];
    scheduleConstraints: {
      trainingDaysPerWeek: number;
      sessionMinutes: 30 | 45 | 60 | 75 | 90;
      notes?: string;
    };
    updatedAt: string;
  };

  export type WorkoutPlan = {
    id: string;
    version: number;
    cycleLengthWeeks: number;
    weeks: Array<{
      weekNumber: number;
      days: Array<{
        dayLabel: string;
        focus: string;
        estimatedMinutes: number;
        exercises: Array<{
          name: string;
          sets: number;
          reps: { min: number; max: number };
          rpe?: number | null;
          intensityPercent1RM?: number | null;
          restSeconds: number;
        }>;
      }>;
    }>;
    progressionNotes: string[];
    substitutions: Array<{
      originalExercise: string;
      substituteExercise: string;
      reason: string;
    }>;
  };

  export type NutritionTargets = {
    id: string;
    version: number;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    notesRules: string[];
  };

  export type MealPlan = {
    id: string;
    version: number;
    days: Array<{
      dayLabel: string;
      meals: Array<{
        mealName: string;
        foods: Array<{
          name: string;
          serving: string;
          estCalories: number;
          estProteinG: number;
          estCarbsG: number;
          estFatG: number;
        }>;
      }>;
    }>;
    groceryList?: string[] | null;
  };

  export type WeeklyCheckin = {
    id: string;
    timestamp: string;
    linkedPlanVersion: {
      workoutVersion: number | null;
      nutritionVersion: number | null;
    };
    currentWeightKg: number;
    waistCm?: number | null;
    progressPhotoPrompted: boolean;
    strengthPRs: string;
    consistencyNotes: string;
    bodyCompChanges: string;
    trainingDifficulty: "too_easy" | "right" | "too_hard";
    nutritionAdherencePercent?: number | null;
    nutritionAdherenceSubjective?: "low" | "medium" | "high" | null;
    appetiteCravings: string;
    energyRating: 1 | 2 | 3 | 4 | 5;
    recoveryRating: 1 | 2 | 3 | 4 | 5;
    sleepAvgHours: number;
    sleepQuality: 1 | 2 | 3 | 4 | 5;
    stressLevel: 1 | 2 | 3 | 4 | 5;
    scheduleConstraintsNextWeek: string;
    injuryPain: {
      hasPain: boolean;
      details: string;
      redFlags: boolean;
    };
    computedAdherenceScore: number;
  };

  export type AdjustmentRecommendations = {
    id: string;
    workoutDiff: ArtifactDiffPatch[];
    nutritionDiff: ArtifactDiffPatch[];
    mealPlanDiff: ArtifactDiffPatch[];
    rationale: {
      training: string;
      nutrition: string;
      coordination: string;
    };
  };

  export type CoachMessage = {
    id: string;
    voice: "unified_primary_coach";
    summary: string;
    focusHabits: [string] | [string, string] | [string, string, string];
    artifactRefs: {
      workoutPlanId?: string;
      nutritionTargetsId?: string;
      mealPlanId?: string;
      adjustmentRecommendationId?: string;
      weeklyCheckinId?: string;
    };
    createdAt: string;
  };
}

export type ArtifactAdjustmentRecommendations = CoachArtifacts.AdjustmentRecommendations;
export type ArtifactCoachMessage = CoachArtifacts.CoachMessage;
