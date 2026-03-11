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
import {
  buildGeneratedTracksFromPlanStart,
  type CoachOnboardingGeneratedTracks,
} from "./results";

function buildGenerationWarning(
  generatedTracks: CoachOnboardingGeneratedTracks,
  planStart: CoachOnboardingDraft["planStart"],
) {
  if (planStart === "both") {
    if (!generatedTracks.workout && !generatedTracks.nutrition) {
      return "Your coaching profile was saved, but we couldn't generate your training or nutrition plan yet. Open either track to retry.";
    }
    if (!generatedTracks.workout) {
      return "Your coaching profile was saved, but we couldn't generate your training plan yet. Open Training to retry.";
    }
    if (!generatedTracks.nutrition) {
      return "Your coaching profile was saved, but we couldn't generate your nutrition plan yet. Open Nutrition to retry.";
    }
    return null;
  }

  if (planStart === "workout" && !generatedTracks.workout) {
    return "Your coaching profile was saved, but we couldn't generate your training plan yet. Open Training to retry.";
  }

  if (planStart === "nutrition" && !generatedTracks.nutrition) {
    return "Your coaching profile was saved, but we couldn't generate your nutrition plan yet. Open Nutrition to retry.";
  }

  return null;
}

function combineWarnings(...warnings: Array<string | null | undefined>) {
  const resolved = warnings
    .map((warning) => warning?.trim() ?? "")
    .filter((warning) => warning.length > 0);

  if (resolved.length === 0) {
    return undefined;
  }

  return resolved.join(" ");
}

export async function submitCoachOnboardingWorkflow(
  draft: CoachOnboardingDraft,
): Promise<
  Result<{
    ok: true;
    nutritionLinked: boolean;
    generatedTracks: CoachOnboardingGeneratedTracks;
    warning?: string;
  }>
> {
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

  const userProfileRes = await upsertCoachUserProfileJson(user.id, mapDraftToCoachUserProfileJson(draft));
  if (userProfileRes.error) return fail(userProfileRes.error);

  const coachRes = await setUnifiedCoachOnServer(user.id, draft.persona.gender, draft.persona.personality);
  if (coachRes.error) return fail(coachRes.error);

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
  const generatedTracks = buildGeneratedTracksFromPlanStart(draft.planStart);
  const canGenerateNutrition = coachRes.data?.nutritionLinked !== false;

  if (draft.planStart === "workout") {
    workoutResult = await runWorkout().then(
      (value) => ({ status: "fulfilled", value }) as const,
      (reason) => ({ status: "rejected", reason }) as const,
    );
    nutritionResult = { status: "fulfilled", value: null };
  } else if (draft.planStart === "nutrition") {
    workoutResult = { status: "fulfilled", value: null };
    nutritionResult = canGenerateNutrition
      ? await runNutrition().then(
          (value) => ({ status: "fulfilled", value }) as const,
          (reason) => ({ status: "rejected", reason }) as const,
        )
      : ({ status: "rejected", reason: new Error("Nutrition coach unavailable.") } as const);
  } else {
    if (canGenerateNutrition) {
      [workoutResult, nutritionResult] = await Promise.allSettled([
        runWorkout(),
        runNutrition(),
      ]);
    } else {
      workoutResult = await runWorkout().then(
        (value) => ({ status: "fulfilled", value }) as const,
        (reason) => ({ status: "rejected", reason }) as const,
      );
      nutritionResult = {
        status: "rejected",
        reason: new Error("Nutrition coach unavailable."),
      };
    }
  }

  const workoutFailed = workoutResult.status === "rejected";
  const nutritionFailed = nutritionResult.status === "rejected";
  if (draft.planStart === "both" || draft.planStart === "workout") {
    generatedTracks.workout = !workoutFailed;
  }
  if (draft.planStart === "both" || draft.planStart === "nutrition") {
    generatedTracks.nutrition = !nutritionFailed;
  }

  const generationWarning = buildGenerationWarning(generatedTracks, draft.planStart);
  const warning = combineWarnings(coachRes.data?.warning, generationWarning);

  return ok({
    ok: true,
    nutritionLinked: coachRes.data?.nutritionLinked ?? true,
    generatedTracks,
    ...(warning ? { warning } : {}),
  });
}
