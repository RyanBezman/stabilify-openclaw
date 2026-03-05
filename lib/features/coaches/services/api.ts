import { supabase } from "../../../supabase";
import { getLocalTimeZone } from "../../../utils/time";
import { createUsernameCandidate } from "../../../utils/username";
import { fail, ok, type Result } from "../../shared";
import type {
  ActiveCoach,
  CoachGender,
  CoachPersonality,
  CoachSpecialization,
} from "../types";
import { coachFromSelection } from "../models/catalog";

type ActiveCoachRow = {
  coach_profile_id: string;
};

type CoachProfileIdentityRow = {
  id: string;
  gender: CoachGender;
  personality: CoachPersonality;
};

type LegacyProfileCoachRow = {
  active_coach_gender: CoachGender | null;
  active_coach_personality: CoachPersonality | null;
};

type CoachUserProfileRow = {
  profile_json: Record<string, unknown> | null;
};

async function fetchCoachProfileById(
  id: string,
): Promise<Result<{ row: CoachProfileIdentityRow | null }>> {
  const { data, error } = await supabase
    .from("coach_profiles")
    .select("id, gender, personality")
    .eq("id", id)
    .maybeSingle<CoachProfileIdentityRow>();

  if (error) return fail(error);
  return ok({ row: data ?? null });
}

export async function fetchActiveCoachFromServer(
  userId: string,
  specialization: CoachSpecialization,
): Promise<Result<{ coach: ActiveCoach | null }>> {
  const { data: activeCoachRow, error: activeCoachError } = await supabase
    .from("active_coaches")
    .select("coach_profile_id")
    .eq("user_id", userId)
    .eq("specialization", specialization)
    .maybeSingle<ActiveCoachRow>();

  if (activeCoachError) return fail(activeCoachError);

  if (activeCoachRow?.coach_profile_id) {
    const profileRes = await fetchCoachProfileById(activeCoachRow.coach_profile_id);
    if (profileRes.error) return fail(profileRes.error);
    const profileRow = profileRes.data?.row;
    if (profileRow?.gender && profileRow?.personality) {
      return ok({
        coach: coachFromSelection(specialization, profileRow.gender, profileRow.personality),
      });
    }
  }

  // Backward-compat fallback for workout while legacy profile columns still exist.
  if (specialization === "workout") {
    const { data, error } = await supabase
      .from("profiles")
      .select("active_coach_gender, active_coach_personality")
      .eq("id", userId)
      .maybeSingle<LegacyProfileCoachRow>();

    if (error) return fail(error);
    if (data?.active_coach_gender && data?.active_coach_personality) {
      return ok({
        coach: coachFromSelection("workout", data.active_coach_gender, data.active_coach_personality),
      });
    }
  }

  return ok({ coach: null });
}

async function resolveCoachProfileId(
  specialization: CoachSpecialization,
  coach: ActiveCoach,
): Promise<Result<{ id: string }>> {
  const { data, error } = await supabase
    .from("coach_profiles")
    .select("id")
    .eq("specialization", specialization)
    .eq("gender", coach.gender)
    .eq("personality", coach.personality)
    .maybeSingle<{ id: string }>();

  if (error) return fail(error);
  if (!data?.id) {
    return fail(
      specialization === "nutrition"
        ? "Couldn't find that nutrition coach profile."
        : "Couldn't find that workout coach profile.",
      { code: "NOT_FOUND" },
    );
  }

  return ok({ id: data.id });
}

export async function setActiveCoachOnServer(
  userId: string,
  specialization: CoachSpecialization,
  coach: ActiveCoach,
): Promise<Result<{ ok: true }>> {
  const profileIdRes = await resolveCoachProfileId(specialization, coach);
  if (profileIdRes.error || !profileIdRes.data) return fail(profileIdRes.error);

  const { error } = await supabase.from("active_coaches").upsert(
    {
      user_id: userId,
      specialization,
      coach_profile_id: profileIdRes.data.id,
      selected_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,specialization",
    },
  );

  if (error) return fail(error);

  // Keep legacy workout columns in sync for backward compatibility.
  if (specialization === "workout") {
    const { data: legacyData, error: legacyError } = await supabase
      .from("profiles")
      .update({
        active_coach_gender: coach.gender,
        active_coach_personality: coach.personality,
        active_coach_selected_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    if (legacyError) return fail(legacyError);
    if (!legacyData) {
      return fail("Couldn't save coach. Finish onboarding first.", { code: "NOT_FOUND" });
    }
  }

  return ok({ ok: true });
}

export async function clearActiveCoachOnServer(
  userId: string,
  specialization: CoachSpecialization,
): Promise<Result<{ ok: true }>> {
  const { error } = await supabase
    .from("active_coaches")
    .delete()
    .eq("user_id", userId)
    .eq("specialization", specialization);

  if (error) return fail(error);

  // Keep legacy workout columns in sync for backward compatibility.
  if (specialization === "workout") {
    const { data, error: legacyError } = await supabase
      .from("profiles")
      .update({
        active_coach_gender: null,
        active_coach_personality: null,
        active_coach_selected_at: null,
      })
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    if (legacyError) return fail(legacyError);
    if (!data) {
      return fail("Couldn't remove coach.", { code: "NOT_FOUND" });
    }
  }

  return ok({ ok: true });
}

export async function setUnifiedCoachOnServer(
  userId: string,
  gender: CoachGender,
  personality: CoachPersonality,
): Promise<Result<{ ok: true; nutritionLinked: boolean; warning?: string }>> {
  const workoutCoach = coachFromSelection("workout", gender, personality);
  const nutritionCoach = coachFromSelection("nutrition", gender, personality);

  const workoutRes = await setActiveCoachOnServer(userId, "workout", workoutCoach);
  if (workoutRes.error) {
    return fail(workoutRes.error ?? "Couldn't save workout coach.");
  }

  const nutritionRes = await setActiveCoachOnServer(userId, "nutrition", nutritionCoach);
  if (nutritionRes.error) {
    return ok({
      ok: true,
      nutritionLinked: false,
      warning:
        nutritionRes.error ?? "Workout coach saved, but nutrition coach could not be linked yet.",
    });
  }

  return ok({ ok: true, nutritionLinked: true });
}

export async function clearUnifiedCoachOnServer(
  userId: string,
): Promise<Result<{ ok: true }>> {
  const workoutRes = await clearActiveCoachOnServer(userId, "workout");
  const nutritionRes = await clearActiveCoachOnServer(userId, "nutrition");

  if (workoutRes.error && nutritionRes.error) {
    return fail(
      `Couldn't clear workout coach (${workoutRes.error}) and nutrition coach (${nutritionRes.error}).`,
    );
  }
  if (workoutRes.error) {
    return fail(workoutRes.error ?? "Couldn't clear workout coach.");
  }
  if (nutritionRes.error) {
    return fail(nutritionRes.error ?? "Couldn't clear nutrition coach.");
  }

  return ok({ ok: true });
}

export async function fetchCoachUserProfileJson(
  userId: string,
): Promise<Result<{ profile: Record<string, unknown> | null }>> {
  const { data, error } = await supabase
    .from("coach_user_profiles")
    .select("profile_json")
    .eq("user_id", userId)
    .maybeSingle<CoachUserProfileRow>();

  if (error) return fail(error);
  return ok({ profile: (data?.profile_json as Record<string, unknown> | null) ?? null });
}

function hasRequiredCoachProfileFields(profile: Record<string, unknown> | null): boolean {
  if (!profile) return false;
  const goals = profile.goals as Record<string, unknown> | undefined;
  const schedule = profile.scheduleConstraints as Record<string, unknown> | undefined;
  const hasGoal = typeof goals?.primary === "string" && goals.primary.length > 0;
  const hasExperience = typeof profile.experienceLevel === "string";
  const hasDays = typeof schedule?.trainingDaysPerWeek === "number";
  const hasMinutes = typeof schedule?.sessionMinutes === "number";
  const hasWeight = typeof profile.weightKg === "number";
  const hasHeight = typeof profile.heightCm === "number";
  const hasSex =
    profile.sex === "male" || profile.sex === "female" || profile.sex === "other";
  return hasGoal && hasExperience && hasDays && hasMinutes && hasWeight && hasHeight && hasSex;
}

export async function fetchCoachOnboardingStatus(
  userId: string,
): Promise<Result<{ complete: boolean }>> {
  const profileRes = await fetchCoachUserProfileJson(userId);
  if (profileRes.error) return fail(profileRes.error);
  return ok({ complete: hasRequiredCoachProfileFields(profileRes.data?.profile ?? null) });
}

export async function upsertCoachUserProfileJson(
  userId: string,
  profileJson: Record<string, unknown>,
): Promise<Result<{ ok: true }>> {
  const { error } = await supabase.from("coach_user_profiles").upsert(
    {
      user_id: userId,
      profile_json: profileJson,
    },
    { onConflict: "user_id" },
  );

  if (error) return fail(error);
  return ok({ ok: true });
}

export async function ensureCoachSelectionProfile(
  userId: string,
  fallbackDisplayName: string,
  timezone = getLocalTimeZone(),
): Promise<Result<{ ok: true }>> {
  const normalizedName = fallbackDisplayName.trim() || "User";
  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        display_name: normalizedName,
        username: createUsernameCandidate(`${normalizedName}_${userId.slice(0, 8)}`),
        preferred_unit: "lb",
        timezone,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );

  if (error) {
    return fail(error);
  }

  return ok({ ok: true });
}
