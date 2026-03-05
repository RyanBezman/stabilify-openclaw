import { supabase } from "../supabase";
import {
  fail,
  ok,
  type Result,
} from "../features/shared";
import type {
  GymSessionStatus,
  GymSessionStatusReason,
  GymSessionValidationDecision,
  GymSessionValidationRequestStatus,
} from "./types";

type GymSessionValidationRequestRow = {
  id: string;
  session_id: string;
  requester_user_id: string;
  status: GymSessionValidationRequestStatus;
  expires_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  expired_at: string | null;
  request_message: string | null;
  created_at: string;
  updated_at: string;
};

type GymSessionValidationRequestWithSessionRow = GymSessionValidationRequestRow & {
  gym_sessions:
    | {
        status: GymSessionStatus;
        session_date: string;
      }
    | Array<{
        status: GymSessionStatus;
        session_date: string;
      }>
    | null;
};

type GymSessionValidationRequestDetailRow = GymSessionValidationRequestRow & {
  gym_sessions:
    | {
        id: string;
        status: GymSessionStatus;
        status_reason: GymSessionStatusReason | null;
        session_date: string;
        recorded_at: string;
        distance_meters: number | null;
        proof_path: string | null;
      }
    | Array<{
        id: string;
        status: GymSessionStatus;
        status_reason: GymSessionStatusReason | null;
        session_date: string;
        recorded_at: string;
        distance_meters: number | null;
        proof_path: string | null;
      }>
    | null;
};

export type GymSessionValidationRequest = {
  id: string;
  sessionId: string;
  requesterUserId: string;
  status: GymSessionValidationRequestStatus;
  expiresAt: string;
  acceptedAt: string | null;
  declinedAt: string | null;
  expiredAt: string | null;
  requestMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubmitGymSessionValidationResult = {
  request: GymSessionValidationRequest;
  sessionStatus: GymSessionStatus | null;
  sessionDate: string | null;
};

export type PendingGymSessionValidationRequest = GymSessionValidationRequest & {
  sessionDate: string;
  requesterDisplayName: string;
  requesterUsername: string;
  requesterAvatarPath: string | null;
};

export type RequestGymSessionValidationInput = {
  message?: string | null;
  userId?: string;
};

export type GymSessionValidationRequestDetail = {
  request: GymSessionValidationRequest;
  requesterDisplayName: string;
  requesterUsername: string;
  requesterAvatarPath: string | null;
  sessionId: string;
  sessionDate: string;
  sessionStatus: GymSessionStatus;
  sessionStatusReason: GymSessionStatusReason | null;
  sessionRecordedAt: string;
  sessionDistanceMeters: number | null;
  proofPath: string | null;
  proofPhotoUrl: string | null;
  proofPhotoError: string | null;
};

type ProfileDirectoryRow = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
};

const GYM_PROOF_SIGNED_URL_TTL_SECONDS = 30 * 60;

function normalizeGymProofPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return "";
  }

  let normalized = trimmed;
  const queryIndex = normalized.indexOf("?");
  if (queryIndex >= 0) {
    normalized = normalized.slice(0, queryIndex);
  }

  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Keep raw value when decode fails.
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    try {
      normalized = new URL(normalized).pathname;
    } catch {
      normalized = trimmed;
    }
  }

  normalized = normalized
    .replace(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/gym-proofs\//i, "")
    .replace(/^\/?gym-proofs\//i, "")
    .replace(/^\/+/, "")
    .trim();

  return normalized;
}

async function probeSignedImageUrl(
  signedUrl: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetch(signedUrl, {
      method: "GET",
      headers: {
        Accept: "image/*",
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `Image download failed (${response.status}).`,
      };
    }

    const contentType = response.headers.get("content-type")?.trim() ?? "";
    if (contentType && !contentType.startsWith("image/")) {
      return {
        ok: false,
        message: `Unexpected image content type: ${contentType}.`,
      };
    }

    const contentLength = response.headers.get("content-length")?.trim() ?? "";
    if (contentLength === "0") {
      return {
        ok: false,
        message: "Uploaded image is empty (0 bytes).",
      };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image download failed.";
    return { ok: false, message };
  }
}

async function getCurrentUserId(userId?: string): Promise<Result<{ userId: string }>> {
  if (userId) {
    return ok({ userId });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    return fail(userError);
  }
  const resolvedUserId = userData.user?.id;
  if (!resolvedUserId) {
    return fail("Missing user session.", { code: "SESSION_REQUIRED" });
  }

  return ok({ userId: resolvedUserId });
}

function normalizeRequestMessage(message: string | null | undefined): string | null {
  if (!message) {
    return null;
  }

  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 180);
}

function mapRequestRow(row: GymSessionValidationRequestRow): GymSessionValidationRequest {
  return {
    id: row.id,
    sessionId: row.session_id,
    requesterUserId: row.requester_user_id,
    status: row.status,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    declinedAt: row.declined_at,
    expiredAt: row.expired_at,
    requestMessage: row.request_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function resolveJoinedGymSession(
  gymSessions:
    | {
        status?: GymSessionStatus;
        session_date?: string;
      }
    | Array<{
        status?: GymSessionStatus;
        session_date?: string;
      }>
    | null
    | undefined
): { status: GymSessionStatus; sessionDate: string } | null {
  const source = Array.isArray(gymSessions) ? gymSessions[0] : gymSessions;
  if (!source?.status || !source?.session_date) {
    return null;
  }

  return {
    status: source.status,
    sessionDate: source.session_date,
  };
}

function resolveJoinedGymSessionDetail(
  gymSessions:
    | {
        id?: string;
        status?: GymSessionStatus;
        status_reason?: GymSessionStatusReason | null;
        session_date?: string;
        recorded_at?: string;
        distance_meters?: number | null;
        proof_path?: string | null;
      }
    | Array<{
        id?: string;
        status?: GymSessionStatus;
        status_reason?: GymSessionStatusReason | null;
        session_date?: string;
        recorded_at?: string;
        distance_meters?: number | null;
        proof_path?: string | null;
      }>
    | null
    | undefined
): {
  id: string;
  status: GymSessionStatus;
  statusReason: GymSessionStatusReason | null;
  sessionDate: string;
  recordedAt: string;
  distanceMeters: number | null;
  proofPath: string | null;
} | null {
  const source = Array.isArray(gymSessions) ? gymSessions[0] : gymSessions;
  if (!source?.id || !source.status || !source.session_date || !source.recorded_at) {
    return null;
  }

  return {
    id: source.id,
    status: source.status,
    statusReason: source.status_reason ?? null,
    sessionDate: source.session_date,
    recordedAt: source.recorded_at,
    distanceMeters: source.distance_meters ?? null,
    proofPath: source.proof_path?.trim() || null,
  };
}

export async function expireGymSessionValidationRequests(
  sessionId?: string | null,
): Promise<Result<{ expiredCount: number }>> {
  const { data, error } = await supabase.rpc("expire_gym_session_validation_requests", {
    p_session_id: sessionId ?? null,
  });

  if (error) {
    return fail(error);
  }

  return ok({
    expiredCount: typeof data === "number" ? data : 0,
  });
}

export async function fetchGymSessionValidationRequestForSession(
  sessionId: string,
  userId?: string,
): Promise<Result<GymSessionValidationRequest | null>> {
  const cleanSessionId = sessionId.trim();
  if (!cleanSessionId) {
    return fail("Session id is required.", { code: "VALIDATION" });
  }

  const userResult = await getCurrentUserId(userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }

  const resolvedUserId = userResult.data.userId;
  const expireResult = await expireGymSessionValidationRequests(cleanSessionId);
  if (expireResult.error) {
    return fail(expireResult.error);
  }

  const { data, error } = await supabase
    .from("gym_session_validation_requests")
    .select(
      "id, session_id, requester_user_id, status, expires_at, accepted_at, declined_at, expired_at, request_message, created_at, updated_at"
    )
    .eq("session_id", cleanSessionId)
    .eq("requester_user_id", resolvedUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return fail(error);
  }

  if (!data) {
    return ok(null);
  }

  return ok(mapRequestRow(data as GymSessionValidationRequestRow));
}

export async function requestGymSessionValidation(
  sessionId: string,
  input?: RequestGymSessionValidationInput,
): Promise<Result<GymSessionValidationRequest>> {
  const cleanSessionId = sessionId.trim();
  if (!cleanSessionId) {
    return fail("Session id is required.", { code: "VALIDATION" });
  }

  const userResult = await getCurrentUserId(input?.userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }

  const resolvedUserId = userResult.data.userId;
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("gym_session_validation_requests")
    .insert({
      session_id: cleanSessionId,
      requester_user_id: resolvedUserId,
      request_message: normalizeRequestMessage(input?.message),
      expires_at: expiresAt,
    })
    .select(
      "id, session_id, requester_user_id, status, expires_at, accepted_at, declined_at, expired_at, request_message, created_at, updated_at"
    )
    .single();

  if (error) {
    return fail(error);
  }

  return ok(mapRequestRow(data as GymSessionValidationRequestRow));
}

export async function submitGymSessionValidation(
  requestId: string,
  decision: GymSessionValidationDecision,
  userId?: string,
): Promise<Result<SubmitGymSessionValidationResult>> {
  const cleanRequestId = requestId.trim();
  if (!cleanRequestId) {
    return fail("Request id is required.", { code: "VALIDATION" });
  }

  const userResult = await getCurrentUserId(userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }

  const resolvedUserId = userResult.data.userId;
  const expireResult = await expireGymSessionValidationRequests();
  if (expireResult.error) {
    return fail(expireResult.error);
  }

  const { data: preflightData, error: preflightError } = await supabase
    .from("gym_session_validation_requests")
    .select(
      "id, session_id, requester_user_id, status, expires_at, accepted_at, declined_at, expired_at, request_message, created_at, updated_at, gym_sessions(status, session_date)"
    )
    .eq("id", cleanRequestId)
    .maybeSingle();

  if (preflightError) {
    return fail(preflightError);
  }

  if (!preflightData) {
    return fail("Validation request not found.", { code: "NOT_FOUND" });
  }

  const preflightRow = preflightData as GymSessionValidationRequestWithSessionRow;
  const preflightSession = resolveJoinedGymSession(preflightRow.gym_sessions);
  if (preflightRow.status !== "open") {
    return fail("This request is no longer open for voting.", { code: "VALIDATION" });
  }
  if (!preflightSession) {
    return fail("This request no longer needs validation.", { code: "VALIDATION" });
  }
  if (preflightSession.status !== "provisional") {
    await expireGymSessionValidationRequests(preflightRow.session_id);
    return fail("This session is already verified. No action is needed.", {
      code: "VALIDATION",
    });
  }

  const { error: voteError } = await supabase
    .from("gym_session_validation_votes")
    .insert({
      request_id: cleanRequestId,
      friend_user_id: resolvedUserId,
      decision,
    });

  if (voteError) {
    const normalizedError = voteError.message?.toLowerCase() ?? "";
    if (
      normalizedError.includes("already closed") ||
      normalizedError.includes("expired") ||
      normalizedError.includes("no longer eligible") ||
      normalizedError.includes("not found")
    ) {
      return fail("This request is no longer open for voting.", { code: "VALIDATION" });
    }
    return fail(voteError);
  }

  const { data, error } = await supabase
    .from("gym_session_validation_requests")
    .select(
      "id, session_id, requester_user_id, status, expires_at, accepted_at, declined_at, expired_at, request_message, created_at, updated_at"
    )
    .eq("id", cleanRequestId)
    .maybeSingle();

  if (error) {
    return fail(error);
  }

  if (!data) {
    return fail("Validation request not found.", { code: "NOT_FOUND" });
  }

  const row = data as GymSessionValidationRequestRow;

  // Best-effort enrichment: once request closes, friend may no longer read session row.
  let sessionStatus: GymSessionStatus | null = null;
  let sessionDate: string | null = null;
  const { data: sessionData } = await supabase
    .from("gym_sessions")
    .select("status, session_date")
    .eq("id", row.session_id)
    .maybeSingle();
  const joinedSession = resolveJoinedGymSession(
    (sessionData as { status?: GymSessionStatus; session_date?: string } | null) ?? null
  );
  if (joinedSession) {
    sessionStatus = joinedSession.status;
    sessionDate = joinedSession.sessionDate;
  }

  return ok({
    request: mapRequestRow(row),
    sessionStatus,
    sessionDate,
  });
}

export async function fetchPendingGymSessionValidationRequests(
  input?: { userId?: string; limit?: number },
): Promise<Result<PendingGymSessionValidationRequest[]>> {
  const userResult = await getCurrentUserId(input?.userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }
  const resolvedUserId = userResult.data.userId;

  const limit = Math.max(1, Math.min(input?.limit ?? 100, 300));
  const expireResult = await expireGymSessionValidationRequests();
  if (expireResult.error) {
    return fail(expireResult.error);
  }

  const { data, error } = await supabase
    .from("gym_session_validation_requests")
    .select(
      "id, session_id, requester_user_id, status, expires_at, accepted_at, declined_at, expired_at, request_message, created_at, updated_at, gym_sessions!inner(session_date)"
    )
    .eq("status", "open")
    .neq("requester_user_id", resolvedUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return fail(error);
  }

  const rows = (data ?? []) as Array<
    GymSessionValidationRequestRow & {
      gym_sessions:
        | { session_date?: string }
        | Array<{ session_date?: string }>
        | null;
    }
  >;

  if (rows.length === 0) {
    return ok([]);
  }

  const requesterIds = [...new Set(rows.map((row) => row.requester_user_id))];
  const { data: profileData, error: profileError } = await supabase
    .from("profile_directory")
    .select("user_id, username, display_name, avatar_path")
    .in("user_id", requesterIds);

  if (profileError) {
    return fail(profileError);
  }

  const profilesById = new Map(
    ((profileData ?? []) as ProfileDirectoryRow[]).map((profile) => [profile.user_id, profile])
  );

  const items: PendingGymSessionValidationRequest[] = rows
    .map((row) => {
      const joinedSession = Array.isArray(row.gym_sessions)
        ? row.gym_sessions[0]
        : row.gym_sessions;
      const sessionDate = joinedSession?.session_date;
      if (!sessionDate) {
        return null;
      }

      const profile = profilesById.get(row.requester_user_id);
      const request = mapRequestRow(row);
      return {
        ...request,
        sessionDate,
        requesterDisplayName:
          profile?.display_name?.trim() || `User ${row.requester_user_id.slice(0, 8)}`,
        requesterUsername:
          profile?.username?.trim() || `user${row.requester_user_id.slice(0, 8)}`,
        requesterAvatarPath: profile?.avatar_path ?? null,
      };
    })
    .filter((item): item is PendingGymSessionValidationRequest => item !== null);

  return ok(items);
}

export async function fetchPendingGymSessionValidationRequestCount(
  userId?: string,
): Promise<Result<{ count: number }>> {
  const userResult = await getCurrentUserId(userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }
  const resolvedUserId = userResult.data.userId;

  const expireResult = await expireGymSessionValidationRequests();
  if (expireResult.error) {
    return fail(expireResult.error);
  }

  const { count, error } = await supabase
    .from("gym_session_validation_requests")
    .select("id", { head: true, count: "exact" })
    .eq("status", "open")
    .neq("requester_user_id", resolvedUserId);

  if (error) {
    return fail(error);
  }

  return ok({ count: count ?? 0 });
}

export async function fetchGymSessionValidationRequestDetail(
  requestId: string,
  userId?: string,
): Promise<Result<GymSessionValidationRequestDetail>> {
  const cleanRequestId = requestId.trim();
  if (!cleanRequestId) {
    return fail("Request id is required.", { code: "VALIDATION" });
  }

  const userResult = await getCurrentUserId(userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }

  const expireResult = await expireGymSessionValidationRequests();
  if (expireResult.error) {
    return fail(expireResult.error);
  }

  const { data, error } = await supabase
    .from("gym_session_validation_requests")
    .select(
      "id, session_id, requester_user_id, status, expires_at, accepted_at, declined_at, expired_at, request_message, created_at, updated_at, gym_sessions!inner(id, status, status_reason, session_date, recorded_at, distance_meters, proof_path)"
    )
    .eq("id", cleanRequestId)
    .eq("status", "open")
    .maybeSingle();

  if (error) {
    return fail(error);
  }

  if (!data) {
    return fail("Validation request not found.", { code: "NOT_FOUND" });
  }

  const row = data as GymSessionValidationRequestDetailRow;
  const sessionDetail = resolveJoinedGymSessionDetail(row.gym_sessions);
  if (!sessionDetail) {
    return fail("Validation request session evidence is unavailable.", { code: "NOT_FOUND" });
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profile_directory")
    .select("user_id, username, display_name, avatar_path")
    .eq("user_id", row.requester_user_id)
    .maybeSingle();

  if (profileError) {
    return fail(profileError);
  }

  const profile = (profileData as ProfileDirectoryRow | null) ?? null;

  let proofPhotoUrl: string | null = null;
  let proofPhotoError: string | null = null;
  const normalizedProofPath = sessionDetail.proofPath
    ? normalizeGymProofPath(sessionDetail.proofPath)
    : "";
  if (normalizedProofPath) {
    const { data: signedData, error: signedError } = await supabase.storage
      .from("gym-proofs")
      .createSignedUrl(normalizedProofPath, GYM_PROOF_SIGNED_URL_TTL_SECONDS);

    if (signedError) {
      proofPhotoError = signedError.message || "Couldn't load proof photo.";
    } else {
      const signedUrl = signedData?.signedUrl ?? null;
      if (!signedUrl) {
        proofPhotoError = "Proof photo URL is unavailable.";
      } else {
        const probeResult = await probeSignedImageUrl(signedUrl);
        if (probeResult.ok) {
          proofPhotoUrl = signedUrl;
        } else {
          proofPhotoError = probeResult.message;
        }
      }
    }
  } else {
    proofPhotoError = "Proof path is missing on this session.";
  }

  return ok({
    request: mapRequestRow(row),
    requesterDisplayName: profile?.display_name?.trim() || `User ${row.requester_user_id.slice(0, 8)}`,
    requesterUsername: profile?.username?.trim() || `user${row.requester_user_id.slice(0, 8)}`,
    requesterAvatarPath: profile?.avatar_path ?? null,
    sessionId: sessionDetail.id,
    sessionDate: sessionDetail.sessionDate,
    sessionStatus: sessionDetail.status,
    sessionStatusReason: sessionDetail.statusReason,
    sessionRecordedAt: sessionDetail.recordedAt,
    sessionDistanceMeters: sessionDetail.distanceMeters,
    proofPath: normalizedProofPath || sessionDetail.proofPath,
    proofPhotoUrl,
    proofPhotoError,
  });
}
