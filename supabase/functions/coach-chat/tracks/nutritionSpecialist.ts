import type { ArtifactDiffPatch, ArtifactWeeklyCheckinInputV2 } from "../schemas.ts";

export type NutritionSpecialistResult = {
  nutritionDiff: ArtifactDiffPatch[];
  mealPlanDiff: ArtifactDiffPatch[];
  rationale: string;
  focusHabit: string;
  largeCalorieDeficit: boolean;
};

type Macros = { proteinG: number; carbsG: number; fatsG: number };
type MealSummary = { name: string; targetCalories: number; items?: string[] };

const CALS_PER_G_PROTEIN = 4;

function recalcMacros(
  currentMacros: Macros,
  currentCalories: number,
  nextCalories: number,
): Macros {
  const proteinCals = currentMacros.proteinG * CALS_PER_G_PROTEIN;
  const oldNonProteinCals = currentCalories - proteinCals;
  const newNonProteinCals = nextCalories - proteinCals;

  if (oldNonProteinCals <= 0 || newNonProteinCals <= 0) {
    return currentMacros;
  }

  const ratio = newNonProteinCals / oldNonProteinCals;
  return {
    proteinG: currentMacros.proteinG,
    carbsG: Math.max(0, Math.round(currentMacros.carbsG * ratio)),
    fatsG: Math.max(0, Math.round(currentMacros.fatsG * ratio)),
  };
}

function rescaleMealCalories(
  meals: MealSummary[],
  currentCalories: number,
  nextCalories: number,
): number[] {
  if (currentCalories <= 0) return meals.map((m) => m.targetCalories);
  const ratio = nextCalories / currentCalories;
  return meals.map((m) => Math.max(50, Math.round(m.targetCalories * ratio)));
}

export function generateNutritionDiff(args: {
  checkin: ArtifactWeeklyCheckinInputV2;
  currentDailyCalories?: number | null;
  currentMacros?: Macros | null;
  currentMeals?: MealSummary[] | null;
  estimatedTdee?: number | null;
  latestScaleWeightKg?: number | null;
}): NutritionSpecialistResult {
  const { checkin } = args;
  const nutritionDiff: ArtifactDiffPatch[] = [];
  const mealPlanDiff: ArtifactDiffPatch[] = [];

  const adherence = typeof checkin.nutritionAdherencePercent === "number"
    ? checkin.nutritionAdherencePercent
    : checkin.computedAdherenceScore;

  const hasLatestScaleWeight = Number.isFinite(args.latestScaleWeightKg);
  const reportedWeightDeltaKg = hasLatestScaleWeight
    ? Number((checkin.currentWeightKg - Number(args.latestScaleWeightKg)).toFixed(1))
    : null;
  const significantReportedGain = Number.isFinite(reportedWeightDeltaKg)
    ? Number(reportedWeightDeltaKg) >= 1
    : false;
  const currentDailyCalories = Number.isFinite(args.currentDailyCalories)
    ? Number(args.currentDailyCalories)
    : null;
  const calorieFloor = 1200;
  const calorieCeiling = 4500;

  const applyCalorieDelta = (delta: number) => {
    if (!Number.isFinite(currentDailyCalories)) return;
    const nextCalories = Math.max(
      calorieFloor,
      Math.min(calorieCeiling, Math.round(currentDailyCalories! + delta))
    );
    if (nextCalories === currentDailyCalories) return;

    nutritionDiff.push({
      op: "replace",
      path: "/dailyCaloriesTarget",
      value: nextCalories,
    });

    if (args.currentMacros) {
      const nextMacros = recalcMacros(args.currentMacros, currentDailyCalories!, nextCalories);
      if (nextMacros.carbsG !== args.currentMacros.carbsG) {
        nutritionDiff.push({ op: "replace", path: "/macros/carbsG", value: nextMacros.carbsG });
      }
      if (nextMacros.fatsG !== args.currentMacros.fatsG) {
        nutritionDiff.push({ op: "replace", path: "/macros/fatsG", value: nextMacros.fatsG });
      }
    }

    if (args.currentMeals?.length) {
      const nextMealCals = rescaleMealCalories(args.currentMeals, currentDailyCalories!, nextCalories);
      const pctChange = Math.abs(Math.round(((nextCalories - currentDailyCalories!) / currentDailyCalories!) * 100));
      const direction = delta < 0 ? "smaller" : "larger";
      for (let i = 0; i < args.currentMeals.length; i++) {
        if (nextMealCals[i] !== args.currentMeals[i].targetCalories) {
          mealPlanDiff.push({
            op: "replace",
            path: `/meals/${i}/targetCalories`,
            value: nextMealCals[i],
          });
        }
        const items = args.currentMeals[i].items;
        if (items?.length) {
          const hint = `Adjust portions ~${pctChange}% ${direction} (${nextMealCals[i]} kcal target)`;
          mealPlanDiff.push({
            op: "replace",
            path: `/meals/${i}/items`,
            value: [...items, hint],
          });
        }
      }
    }
  };

  if (adherence < 70) {
    applyCalorieDelta(150);
  } else if (significantReportedGain) {
    applyCalorieDelta(-150);
    mealPlanDiff.push({
      op: "replace",
      path: "/notes/0",
      value: "Apply one lower-calorie high-protein swap daily for the next 7 days.",
    });
  }

  if (checkin.appetiteCravings.trim()) {
    mealPlanDiff.push({
      op: "replace",
      path: "/notes/1",
      value: checkin.appetiteCravings,
    });
  }

  if (checkin.scheduleConstraintsNextWeek.trim()) {
    mealPlanDiff.push({
      op: "replace",
      path: "/notes/2",
      value: checkin.scheduleConstraintsNextWeek,
    });
  }

  const largeCalorieDeficit = adherence < 60;

  return {
    nutritionDiff,
    mealPlanDiff,
    rationale:
      adherence < 70
        ? "Nutrition targets were made more adherence-friendly due to reduced consistency."
        : significantReportedGain
          ? "Nutrition targets were tightened after a reported week-over-week weight increase."
        : "Nutrition targets remain stable with minor behavior-focused adjustments.",
    focusHabit:
      adherence < 70
        ? "Pre-plan one anchor high-protein meal each day to improve consistency."
        : significantReportedGain
          ? "Use one planned lower-calorie meal swap each day while keeping protein high."
        : "Keep protein and fiber targets consistent across the week.",
    largeCalorieDeficit,
  };
}
