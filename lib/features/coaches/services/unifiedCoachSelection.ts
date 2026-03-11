import { fail, ok, type Result } from "../../shared";
import { coachFromSelection } from "../models/catalog";
import type { ActiveCoach, CoachSpecialization } from "../types";
import {
  clearActiveCoachOnServer,
  setActiveCoachOnServer,
  setUnifiedCoachOnServer,
} from "./api";
import { preserveUnifiedCoachSetupOnServer } from "./preserveSetup";

type CoachSelectionBySpecialization = Record<CoachSpecialization, ActiveCoach | null>;

type PersistUnifiedCoachSelectionInput = {
  userId: string;
  targetCoach: ActiveCoach;
  currentSelection: CoachSelectionBySpecialization;
  preservePrograms?: boolean;
};

type PersistUnifiedCoachSelectionResult = {
  workoutCoach: ActiveCoach;
  nutritionCoach: ActiveCoach | null;
  warning?: string;
};

const SPECIALIZATIONS: CoachSpecialization[] = ["workout", "nutrition"];

function buildTargetSelection(targetCoach: ActiveCoach): {
  workoutCoach: ActiveCoach;
  nutritionCoach: ActiveCoach;
} {
  return {
    workoutCoach: coachFromSelection(
      "workout",
      targetCoach.gender,
      targetCoach.personality,
    ),
    nutritionCoach: coachFromSelection(
      "nutrition",
      targetCoach.gender,
      targetCoach.personality,
    ),
  };
}

async function restoreCoachSelectionOnServer(
  userId: string,
  selection: CoachSelectionBySpecialization,
): Promise<Result<{ ok: true }>> {
  const errors: string[] = [];

  for (const specialization of SPECIALIZATIONS) {
    const coach = selection[specialization];
    const result = coach
      ? await setActiveCoachOnServer(userId, specialization, coach)
      : await clearActiveCoachOnServer(userId, specialization);

    if (result.error) {
      errors.push(`${specialization}: ${result.error}`);
    }
  }

  if (errors.length > 0) {
    return fail(`Couldn't restore previous coach selection (${errors.join("; ")}).`);
  }

  return ok({ ok: true });
}

export async function persistUnifiedCoachSelectionOnServer({
  userId,
  targetCoach,
  currentSelection,
  preservePrograms = false,
}: PersistUnifiedCoachSelectionInput): Promise<Result<PersistUnifiedCoachSelectionResult>> {
  const nextSelection = buildTargetSelection(targetCoach);

  const setSelectionResult = await setUnifiedCoachOnServer(
    userId,
    targetCoach.gender,
    targetCoach.personality,
  );
  if (setSelectionResult.error) {
    return fail(setSelectionResult.error ?? "Couldn't save coach.");
  }

  const linkedNutritionCoach =
    setSelectionResult.data?.nutritionLinked === false
      ? null
      : nextSelection.nutritionCoach;

  if (preservePrograms) {
    const preserveResult = await preserveUnifiedCoachSetupOnServer({
      userId,
      sourceSelection: currentSelection,
      targetSelection: {
        workout: nextSelection.workoutCoach,
        nutrition: linkedNutritionCoach,
      },
    });

    if (preserveResult.error) {
      const rollbackResult = await restoreCoachSelectionOnServer(
        userId,
        currentSelection,
      );
      if (rollbackResult.error) {
        return fail(
          `${preserveResult.error ?? "Couldn't keep your current coaching setup."} ${rollbackResult.error}`,
        );
      }

      return fail(preserveResult.error ?? "Couldn't keep your current coaching setup.");
    }
  }

  return ok({
    workoutCoach: nextSelection.workoutCoach,
    nutritionCoach: linkedNutritionCoach,
    ...(setSelectionResult.data?.warning
      ? { warning: setSelectionResult.data.warning }
      : {}),
  });
}
