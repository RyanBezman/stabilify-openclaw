import { supabase } from "../../supabase";
import { DEFAULT_GYM_RADIUS_METERS } from "./types";
import type { GymSettingsValues } from "./types";
import { fail, ok, type Result } from "../shared";

export async function fetchGymSettingsValues(): Promise<Result<GymSettingsValues>> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    return fail("Please sign in again.", { code: "SESSION_REQUIRED" });
  }

  const { data, error } = await supabase
    .from("routines")
    .select(
      "gym_proof_enabled, gym_name, gym_place_name, gym_place_address, gym_lat, gym_lng, gym_radius_m",
    )
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error) {
    return fail(error);
  }

  if (!data) {
    return ok({
      gymProofEnabled: false,
      gymName: "",
      gymPlaceName: "",
      gymPlaceAddress: "",
      gymLat: null,
      gymLng: null,
      gymRadiusM: String(DEFAULT_GYM_RADIUS_METERS),
    });
  }

  return ok({
    gymProofEnabled: Boolean(data.gym_proof_enabled),
    gymName: data.gym_name ?? "",
    gymPlaceName: data.gym_place_name ?? "",
    gymPlaceAddress: data.gym_place_address ?? "",
    gymLat: data.gym_lat === null ? null : Number(data.gym_lat),
    gymLng: data.gym_lng === null ? null : Number(data.gym_lng),
    gymRadiusM: String(data.gym_radius_m ?? DEFAULT_GYM_RADIUS_METERS),
  });
}

export async function saveGymSettingsValues(
  values: GymSettingsValues,
): Promise<Result<{ ok: true }>> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    return fail("Please sign in again.", { code: "SESSION_REQUIRED" });
  }

  const { error } = await supabase
    .from("routines")
    .update({
      gym_proof_enabled: values.gymProofEnabled,
      gym_name: values.gymName.trim() || null,
      gym_place_name: values.gymProofEnabled
        ? values.gymPlaceName.trim() || null
        : null,
      gym_place_address: values.gymProofEnabled
        ? values.gymPlaceAddress.trim() || null
        : null,
      gym_lat: values.gymProofEnabled ? values.gymLat : null,
      gym_lng: values.gymProofEnabled ? values.gymLng : null,
      gym_radius_m: values.gymProofEnabled
        ? Number(values.gymRadiusM) || DEFAULT_GYM_RADIUS_METERS
        : DEFAULT_GYM_RADIUS_METERS,
    })
    .eq("user_id", userData.user.id);

  if (error) {
    return fail(error);
  }

  return ok({ ok: true });
}
