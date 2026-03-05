import { supabase } from "../supabase";
import type { GoalType, WeightUnit, WeighInCadence } from "./types";
import { getUsernameValidationError, normalizeUsername } from "../utils/username";
import { fail, ok, type Result } from "../features/shared";

export type OnboardingInput = {
  displayName: string;
  username: string;
  preferredUnit: WeightUnit;
  goalType: GoalType;
  currentWeight: number;
  targetMin: number | null;
  targetMax: number | null;
  targetWeight: number | null;
  weighInCadence: WeighInCadence;
  customCadence: number | null;
  reminderTime: string | null;
  timezone: string;
  gymProofEnabled: boolean;
  gymName: string | null;
  gymSessionsTarget: number;
  gymPlaceName: string | null;
  gymPlaceAddress: string | null;
  gymLat: number | null;
  gymLng: number | null;
  gymRadiusM: number;
};

const normalizeNullableText = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function saveOnboarding(input: OnboardingInput): Promise<Result<{ ok: true }>> {
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError) {
    return fail(userError);
  }
  if (!data?.user) {
    return fail("You need to be signed in to finish setup.", { code: "SESSION_REQUIRED" });
  }

  const userId = data.user.id;
  const isMaintain = input.goalType === "maintain";
  const username = normalizeUsername(input.username);
  const usernameError = getUsernameValidationError(username);
  if (usernameError) {
    return fail(usernameError, { code: "VALIDATION" });
  }

  const profilePayload = {
    id: userId,
    display_name: input.displayName,
    username,
    preferred_unit: input.preferredUnit,
    timezone: input.timezone,
  };

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" });
  if (profileError) {
    return fail(profileError);
  }

  const routinePayload = {
    user_id: userId,
    weigh_in_cadence: input.weighInCadence,
    custom_cadence: input.customCadence,
    reminder_time: normalizeNullableText(input.reminderTime),
    gym_proof_enabled: input.gymProofEnabled,
    gym_name: normalizeNullableText(input.gymName),
    gym_sessions_target: input.gymSessionsTarget,
    gym_place_name: normalizeNullableText(input.gymPlaceName),
    gym_place_address: normalizeNullableText(input.gymPlaceAddress),
    gym_lat: input.gymLat,
    gym_lng: input.gymLng,
    gym_radius_m: input.gymRadiusM,
  };

  const { error: routineError } = await supabase
    .from("routines")
    .upsert(routinePayload, { onConflict: "user_id" });
  if (routineError) {
    return fail(routineError);
  }

  const { data: activeGoal, error: activeGoalError } = await supabase
    .from("goals")
    .select("id, goal_type")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (activeGoalError) {
    return fail(activeGoalError);
  }

  if (activeGoal && activeGoal.goal_type !== input.goalType) {
    const { error: closeError } = await supabase
      .from("goals")
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq("id", activeGoal.id);
    if (closeError) {
      return fail(closeError);
    }
  }

  const goalPayload = {
    user_id: userId,
    goal_type: input.goalType,
    start_weight: input.currentWeight,
    target_min: isMaintain ? input.targetMin : null,
    target_max: isMaintain ? input.targetMax : null,
    target_weight: isMaintain ? null : input.targetWeight,
    is_active: true,
    ended_at: null,
  };

  if (activeGoal && activeGoal.goal_type === input.goalType) {
    const { error: goalUpdateError } = await supabase
      .from("goals")
      .update(goalPayload)
      .eq("id", activeGoal.id);
    if (goalUpdateError) {
      return fail(goalUpdateError);
    }
  } else {
    const { error: goalInsertError } = await supabase
      .from("goals")
      .insert(goalPayload);
    if (goalInsertError) {
      return fail(goalInsertError);
    }
  }

  return ok({ ok: true });
}
