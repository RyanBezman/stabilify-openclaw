import { fetchCurrentAuthUser } from "../../auth";
import { fail, ok, type Result } from "../../shared";
import { invokeCoachChat } from "../services/chatClient";
import {
  ensureCoachSelectionProfile,
  setUnifiedCoachOnServer,
  upsertCoachUserProfileJson,
} from "../services/api";
import type { CoachOnboardingDraft } from "./models";
import {
  mapDraftToCoachUserProfileJson,
  mapDraftToNutritionIntake,
  mapDraftToWorkoutIntake,
} from "./mapper";

export async function submitCoachOnboardingWorkflow(
  draft: CoachOnboardingDraft,
): Promise<Result<{ ok: true }>> {
  const authResult = await fetchCurrentAuthUser();
  if (authResult.error) return fail(authResult.error);

  const user = authResult.data?.user;
  if (!user?.id) return fail("You must be signed in to continue.");

  const fallbackName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    (typeof user.email === "string" && user.email.trim()) ||
    "User";
  const fallbackTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const profileRes = await ensureCoachSelectionProfile(user.id, fallbackName, fallbackTimezone);
  if (profileRes.error) return fail(profileRes.error);

  const coachRes = await setUnifiedCoachOnServer(user.id, draft.persona.gender, draft.persona.personality);
  if (coachRes.error) return fail(coachRes.error);

  const userProfileRes = await upsertCoachUserProfileJson(user.id, mapDraftToCoachUserProfileJson(draft));
  if (userProfileRes.error) return fail(userProfileRes.error);

  const coachIdentityPayload = {
    coach_gender: draft.persona.gender,
    coach_personality: draft.persona.personality,
  };

  const runWorkout = () =>
    invokeCoachChat({
      action: "plan_generate",
      specialization: "workout",
      plan_type: "workout",
      intake: mapDraftToWorkoutIntake(draft),
      ...coachIdentityPayload,
    });

  const runNutrition = () =>
    invokeCoachChat({
      action: "plan_generate",
      specialization: "nutrition",
      plan_type: "nutrition",
      intake: mapDraftToNutritionIntake(draft),
      ...coachIdentityPayload,
    });

  let workoutResult: PromiseSettledResult<unknown>;
  let nutritionResult: PromiseSettledResult<unknown>;

  if (draft.planStart === "workout") {
    workoutResult = await runWorkout().then(
      (value) => ({ status: "fulfilled", value }) as const,
      (reason) => ({ status: "rejected", reason }) as const,
    );
    nutritionResult = { status: "fulfilled", value: null };
  } else if (draft.planStart === "nutrition") {
    workoutResult = { status: "fulfilled", value: null };
    nutritionResult = await runNutrition().then(
      (value) => ({ status: "fulfilled", value }) as const,
      (reason) => ({ status: "rejected", reason }) as const,
    );
  } else {
    [workoutResult, nutritionResult] = await Promise.allSettled([
      runWorkout(),
      runNutrition(),
    ]);
  }

  const workoutFailed = workoutResult.status === "rejected";
  const nutritionFailed = nutritionResult.status === "rejected";

  if (draft.planStart === "both") {
    if (workoutFailed && nutritionFailed) {
      return fail("Could not generate workout and nutrition plans yet. Please retry.");
    }
    if (workoutFailed) {
      return fail("Nutrition plan generated, but workout plan failed. Please retry to generate your workout plan.");
    }
    if (nutritionFailed) {
      return fail("Workout plan generated, but nutrition plan failed. Please retry to generate your nutrition plan.");
    }
  }

  if (draft.planStart === "workout" && workoutFailed) {
    return fail("Could not generate your workout plan yet. Please retry.");
  }

  if (draft.planStart === "nutrition" && nutritionFailed) {
    return fail("Could not generate your nutrition plan yet. Please retry.");
  }

  return ok({ ok: true });
}
