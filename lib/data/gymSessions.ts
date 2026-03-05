import { supabase } from "../supabase";
import type { GymSessionStatus, GymSessionStatusReason } from "./types";
import { formatLocalDate } from "../utils/metrics";
import { getLocalTimeZone } from "../utils/time";
import { recordActivityEvent } from "./activityEvents";
import { fail, ok, type Result } from "../features/shared";

export type GymSessionDefaults = {
  timezone: string;
};

export type SaveGymSessionInput = {
  recordedAt: Date;
  timezone: string;
  status?: GymSessionStatus;
  photoUri?: string;
  photoMimeType?: string | null;
  photoFileName?: string | null;
  photoBase64?: string | null;
  location?: { latitude: number; longitude: number };
  locationPermissionDenied?: boolean;
};

function resolveProofUploadMeta(input: Pick<SaveGymSessionInput, "photoMimeType" | "photoFileName">) {
  const normalizedMime =
    typeof input.photoMimeType === "string" && input.photoMimeType.startsWith("image/")
      ? input.photoMimeType
      : null;

  const fileName = input.photoFileName?.trim() ?? "";
  const fileExtFromName = fileName.includes(".")
    ? fileName.split(".").pop()?.toLowerCase()
    : null;
  const fileExtFromMime = normalizedMime?.replace("image/", "").toLowerCase() ?? null;
  const rawExt = fileExtFromName || fileExtFromMime || "jpg";
  const extension = rawExt === "jpeg" ? "jpg" : rawExt;

  return {
    contentType: normalizedMime ?? "image/jpeg",
    extension,
  };
}

function base64ToBytes(base64: string): Uint8Array | null {
  const clean = base64.trim();
  if (!clean) {
    return null;
  }

  const decoder = globalThis.atob;
  if (!decoder) {
    return null;
  }

  const binary = decoder(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function fetchGymSessionDefaults(
  userId?: string
): Promise<Result<GymSessionDefaults>> {
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

  const { data: profileRes, error: profileError } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", resolvedUserId)
    .maybeSingle();

  if (profileError) {
    return fail(profileError);
  }

  return ok({
    timezone: profileRes?.timezone ?? getLocalTimeZone(),
  });
}

export async function saveGymSession(
  input: SaveGymSessionInput
): Promise<
  Result<{
    sessionId: string;
    sessionDate: string;
    status: GymSessionStatus;
    statusReason: GymSessionStatusReason | null;
    distanceMeters: number | null;
  }>
> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    return fail(userError);
  }
  const userId = userData.user?.id;
  if (!userId) {
    return fail("You need to be signed in to log a gym session.", { code: "SESSION_REQUIRED" });
  }

  const sessionDate = formatLocalDate(input.recordedAt, input.timezone);
  const fallbackStatus = input.status ?? "partial";

  const { data: existingSession, error: existingError } = await supabase
    .from("gym_sessions")
    .select("status, proof_path, proof_captured_at")
    .eq("user_id", userId)
    .eq("session_date", sessionDate)
    .maybeSingle();
  if (existingError) {
    return fail(existingError);
  }
  if (existingSession?.status === "verified") {
    return fail("Today's session is already verified.");
  }

  let gymRadius = 0;
  let gymLat: number | null = null;
  let gymLng: number | null = null;
  const { data: routineData, error: routineError } = await supabase
    .from("routines")
    .select("gym_lat, gym_lng, gym_radius_m")
    .eq("user_id", userId)
    .maybeSingle();
  if (routineError) {
    return fail(routineError);
  }
  if (
    routineData?.gym_lat !== null &&
    routineData?.gym_lat !== undefined &&
    routineData?.gym_lng !== null &&
    routineData?.gym_lng !== undefined
  ) {
    gymLat = Number(routineData.gym_lat);
    gymLng = Number(routineData.gym_lng);
    gymRadius = Number(routineData.gym_radius_m ?? 0);
  }

  let proofPath: string | null = null;
  if (input.photoUri) {
    const uploadMeta = resolveProofUploadMeta({
      photoMimeType: input.photoMimeType,
      photoFileName: input.photoFileName,
    });
    let uploadBody: Blob | Uint8Array | null = null;
    let contentType = uploadMeta.contentType;

    const base64Bytes = input.photoBase64 ? base64ToBytes(input.photoBase64) : null;
    if (base64Bytes && base64Bytes.byteLength > 0) {
      uploadBody = base64Bytes;
    } else {
      const response = await fetch(input.photoUri);
      if (!response.ok) {
        return fail(`Couldn't read captured photo (status ${response.status}).`);
      }

      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        return fail("Captured photo is empty. Please retake the photo.");
      }

      const blobType = blob.type?.trim();
      contentType =
        blobType && blobType.startsWith("image/") ? blobType : uploadMeta.contentType;
      uploadBody = blob;
    }

    if (!uploadBody) {
      return fail("Couldn't prepare photo upload bytes.");
    }

    const fileExtFromBlob = contentType.replace("image/", "").toLowerCase();
    const extension = fileExtFromBlob === "jpeg" ? "jpg" : fileExtFromBlob || uploadMeta.extension;
    const fileName = `gym-${sessionDate}-${input.recordedAt.getTime()}.${extension}`;
    proofPath = `${userId}/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from("gym-proofs")
      .upload(proofPath, uploadBody, {
        contentType,
        upsert: true,
      });
    if (uploadError) {
      return fail(uploadError);
    }
  }
  const resolvedProofPath = proofPath ?? existingSession?.proof_path ?? null;
  const resolvedProofCapturedAt = input.photoUri
    ? input.recordedAt.toISOString()
    : existingSession?.proof_captured_at ?? null;

  const gymCoordinates =
    gymLat !== null && gymLng !== null
      ? { latitude: gymLat, longitude: gymLng }
      : null;
  const hasGymSetup = gymCoordinates !== null && gymRadius > 0;
  let shouldVerify = false;
  if (input.location && hasGymSetup) {
    const distance = getDistanceMeters(input.location, gymCoordinates);
    shouldVerify = distance <= gymRadius;
  }

  const resolvedStatus =
    input.location && hasGymSetup
      ? shouldVerify
        ? "verified"
        : "provisional"
      : fallbackStatus;

  const resolvedStatusReason = resolveGymSessionStatusReason({
    status: resolvedStatus,
    hasPhoto: Boolean(input.photoUri),
    hasLocation: Boolean(input.location),
    hasGymSetup,
    locationPermissionDenied: input.locationPermissionDenied ?? false,
  });

  const distanceMeters =
    input.location && gymCoordinates
      ? getDistanceMeters(input.location, gymCoordinates)
      : null;

  const { data: savedGymSession, error: saveError } = await supabase
    .from("gym_sessions")
    .upsert(
      {
        user_id: userId,
        session_date: sessionDate,
        status: resolvedStatus,
        status_reason: resolvedStatusReason,
        recorded_at: input.recordedAt.toISOString(),
        verified_at: resolvedStatus === "verified" ? input.recordedAt.toISOString() : null,
        timezone: input.timezone,
        proof_path: resolvedProofPath,
        proof_captured_at: resolvedProofCapturedAt,
        proof_lat: input.location?.latitude ?? null,
        proof_lng: input.location?.longitude ?? null,
        distance_meters: distanceMeters,
      },
      { onConflict: "user_id,session_date" }
    )
    .select("id")
    .single();

  if (saveError) {
    return fail(saveError);
  }

  if (resolvedStatus === "verified") {
    const { error: expireValidationError } = await supabase.rpc(
      "expire_gym_session_validation_requests",
      {
        p_session_id: savedGymSession.id,
      },
    );
    if (expireValidationError) {
      // Best-effort expiration should not block successful session saves.
      // eslint-disable-next-line no-console
      console.warn(
        "Failed to expire stale gym validation requests:",
        expireValidationError,
      );
    }

    const { error: activityEventError } = await recordActivityEvent({
      actorUserId: userId,
      eventType: "gym_session_verified",
      eventDate: sessionDate,
      sourceTable: "gym_sessions",
      sourceId: savedGymSession?.id ?? null,
      payload: { milestone: "gym_session_verified" },
      visibility: "private",
    });
    if (activityEventError) {
      // Event archiving is best-effort and should not block successful session saves.
      // eslint-disable-next-line no-console
      console.warn("Failed to record activity event for gym session:", activityEventError);
    }
  }

  return ok({
    sessionId: savedGymSession.id,
    sessionDate,
    status: resolvedStatus,
    statusReason: resolvedStatusReason,
    distanceMeters,
  });
}

type ResolveGymSessionStatusReasonInput = {
  status: GymSessionStatus;
  hasPhoto: boolean;
  hasLocation: boolean;
  hasGymSetup: boolean;
  locationPermissionDenied: boolean;
};

function resolveGymSessionStatusReason(
  input: ResolveGymSessionStatusReasonInput
): GymSessionStatusReason | null {
  if (input.status === "verified") {
    return null;
  }

  if (input.status === "provisional") {
    return "outside_radius";
  }

  if (!input.hasPhoto) {
    return "missing_photo";
  }

  if (!input.hasLocation) {
    return input.locationPermissionDenied ? "permission_denied" : "missing_location";
  }

  if (!input.hasGymSetup) {
    return "missing_gym_setup";
  }

  return "missing_location";
}

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceMeters = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) => {
  const earthRadius = 6371000;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
};
