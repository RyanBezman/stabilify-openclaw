import {
  defaultIntake,
  defaultNutritionIntake,
  isNutritionIntake,
  isNutritionPlan,
  isWorkoutIntake,
  isWorkoutPlan,
} from "./workspaceHelpers";
import type {
  CoachIntake,
  CoachPlan,
  NutritionGoal,
  NutritionIntake,
  NutritionPlan,
  PlanStatus,
  WorkoutIntake,
  WorkoutPlan,
} from "../types/workspaceTypes";

type DisplayedPlanKind = "current" | "new" | "none";

type WorkspacePlanViewInput = {
  activePlan: CoachPlan | null;
  defaultNutritionGoal: NutritionGoal;
  draftPlan: CoachPlan | null;
  intake: CoachIntake;
  showDraftInPlan: boolean;
};

type WorkspacePlanView = {
  displayedPlanKind: DisplayedPlanKind;
  displayedNutritionPlan: NutritionPlan | null;
  displayedWorkoutPlan: WorkoutPlan | null;
  hasAnyPlan: boolean;
  hasToggle: boolean;
  nutritionActivePlan: NutritionPlan | null;
  nutritionDraftPlan: NutritionPlan | null;
  nutritionIntake: NutritionIntake;
  planBadge: PlanStatus;
  workoutActivePlan: WorkoutPlan | null;
  workoutDraftPlan: WorkoutPlan | null;
  workoutIntake: WorkoutIntake;
};

export function deriveWorkspacePlanView({
  activePlan,
  defaultNutritionGoal,
  draftPlan,
  intake,
  showDraftInPlan,
}: WorkspacePlanViewInput): WorkspacePlanView {
  const displayedPlan =
    showDraftInPlan && draftPlan ? draftPlan : !activePlan && draftPlan ? draftPlan : activePlan;

  const displayedPlanKind: DisplayedPlanKind = !displayedPlan
    ? "none"
    : activePlan && displayedPlan === activePlan
      ? "current"
      : "new";

  const planBadge: PlanStatus = activePlan ? "active" : draftPlan ? "draft" : "none";
  const hasAnyPlan = Boolean(activePlan || draftPlan);
  const hasToggle = Boolean(activePlan && draftPlan);
  const displayedWorkoutPlan = isWorkoutPlan(displayedPlan) ? displayedPlan : null;
  const displayedNutritionPlan = isNutritionPlan(displayedPlan) ? displayedPlan : null;
  const workoutActivePlan = isWorkoutPlan(activePlan) ? activePlan : null;
  const workoutDraftPlan = isWorkoutPlan(draftPlan) ? draftPlan : null;
  const nutritionActivePlan = isNutritionPlan(activePlan) ? activePlan : null;
  const nutritionDraftPlan = isNutritionPlan(draftPlan) ? draftPlan : null;
  const workoutIntake = isWorkoutIntake(intake) ? intake : defaultIntake;
  const baseNutritionIntake = isNutritionIntake(intake) ? intake : defaultNutritionIntake;
  const nutritionIntake: NutritionIntake = {
    ...baseNutritionIntake,
    goal: baseNutritionIntake.goal ?? defaultNutritionGoal,
  };

  return {
    displayedPlanKind,
    displayedNutritionPlan,
    displayedWorkoutPlan,
    hasAnyPlan,
    hasToggle,
    nutritionActivePlan,
    nutritionDraftPlan,
    nutritionIntake,
    planBadge,
    workoutActivePlan,
    workoutDraftPlan,
    workoutIntake,
  };
}
