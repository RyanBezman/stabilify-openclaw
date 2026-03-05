import { supabase } from "../supabase";
import type { WeightUnit } from "./types";
import { formatLocalDate } from "../utils/metrics";
import { getLocalTimeZone } from "../utils/time";
import { recordActivityEvent } from "./activityEvents";
import { fail, ok, type Result } from "../features/shared";

export type WeighInSnapshot = {
  weight: number;
  unit: WeightUnit;
  recordedAt: string;
  localDate: string;
};

export type WeighInDefaults = {
  preferredUnit: WeightUnit;
  timezone: string;
  latestWeighIn: WeighInSnapshot | null;
};

export type SaveWeighInInput = {
  weight: number;
  unit: WeightUnit;
  recordedAt: Date;
  timezone: string;
};

export async function fetchWeighInDefaults(
  userId?: string
): Promise<Result<WeighInDefaults>> {
  let resolvedUserId = userId;

  if (!resolvedUserId) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      return fail(userError);
    }
    resolvedUserId = userData.user?.id;
  }

  if (!resolvedUserId) {
    return fail("Missing user session.", { code: "SESSION_REQUIRED" });
  }

  const [profileRes, latestRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("preferred_unit, timezone")
      .eq("id", resolvedUserId)
      .maybeSingle(),
    supabase
      .from("weigh_ins")
      .select("weight, unit, recorded_at, local_date")
      .eq("user_id", resolvedUserId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileRes.error) {
    return fail(profileRes.error);
  }
  if (latestRes.error) {
    return fail(latestRes.error);
  }

  const preferredUnit =
    (profileRes.data?.preferred_unit as WeightUnit | undefined) ?? "lb";
  const timezone = profileRes.data?.timezone ?? getLocalTimeZone();
  const latestWeighIn = latestRes.data
    ? {
        weight: latestRes.data.weight,
        unit: latestRes.data.unit as WeightUnit,
        recordedAt: latestRes.data.recorded_at,
        localDate: latestRes.data.local_date,
      }
    : null;

  return ok({
    preferredUnit,
    timezone,
    latestWeighIn,
  });
}

export async function saveWeighIn(
  input: SaveWeighInInput
): Promise<Result<{ localDate: string }>> {
  if (!Number.isFinite(input.weight) || input.weight <= 0) {
    return fail("Weight must be greater than zero.", { code: "VALIDATION" });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    return fail(userError);
  }
  const userId = userData.user?.id;
  if (!userId) {
    return fail("You need to be signed in to log a weigh-in.", { code: "SESSION_REQUIRED" });
  }

  const localDate = formatLocalDate(input.recordedAt, input.timezone);
  const { data: savedWeighIn, error: saveError } = await supabase
    .from("weigh_ins")
    .upsert(
      {
        user_id: userId,
        weight: input.weight,
        unit: input.unit,
        recorded_at: input.recordedAt.toISOString(),
        local_date: localDate,
        timezone: input.timezone,
      },
      { onConflict: "user_id,local_date" }
    )
    .select("id")
    .single();

  if (saveError) {
    return fail(saveError);
  }

  const { error: activityEventError } = await recordActivityEvent({
    actorUserId: userId,
    eventType: "weigh_in_logged",
    eventDate: localDate,
    sourceTable: "weigh_ins",
    sourceId: savedWeighIn?.id ?? null,
    payload: { milestone: "weigh_in_logged" },
    visibility: "private",
  });
  if (activityEventError) {
    // Event archiving is best-effort and should not block successful weigh-ins.
    // eslint-disable-next-line no-console
    console.warn("Failed to record activity event for weigh-in:", activityEventError);
  }

  return ok({ localDate });
}
