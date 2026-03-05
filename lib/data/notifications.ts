import { fail, ok, type Result } from "../features/shared";
import {
  fetchPendingGymSessionValidationRequestCount,
  fetchPendingGymSessionValidationRequests,
  type PendingGymSessionValidationRequest,
} from "./gymSessionValidation";
import {
  fetchPendingIncomingFollowRequestCount,
  fetchPendingIncomingFollowRequests,
  type PendingIncomingFollowRequest,
} from "./relationships";

export type FollowRequestNotification = {
  id: string;
  type: "follow_request";
  createdAt: string;
  requestId: string;
  requesterUserId: string;
  requesterDisplayName: string;
  requesterUsername: string;
  requesterAvatarPath: string | null;
};

export type GymValidationRequestNotification = {
  id: string;
  type: "gym_validation_request";
  createdAt: string;
  requestId: string;
  requesterUserId: string;
  requesterDisplayName: string;
  requesterUsername: string;
  requesterAvatarPath: string | null;
  sessionDate: string;
  requestMessage: string | null;
};

export type ActionableNotification =
  | FollowRequestNotification
  | GymValidationRequestNotification;

function mapFollowRequestNotification(entry: PendingIncomingFollowRequest): FollowRequestNotification {
  return {
    id: `follow:${entry.requestId}`,
    type: "follow_request",
    createdAt: entry.createdAt,
    requestId: entry.requestId,
    requesterUserId: entry.requesterUserId,
    requesterDisplayName: entry.requesterDisplayName,
    requesterUsername: entry.requesterUsername,
    requesterAvatarPath: entry.requesterAvatarPath,
  };
}

function mapGymValidationNotification(
  entry: PendingGymSessionValidationRequest,
): GymValidationRequestNotification {
  return {
    id: `gym_validation:${entry.id}`,
    type: "gym_validation_request",
    createdAt: entry.createdAt,
    requestId: entry.id,
    requesterUserId: entry.requesterUserId,
    requesterDisplayName: entry.requesterDisplayName,
    requesterUsername: entry.requesterUsername,
    requesterAvatarPath: entry.requesterAvatarPath,
    sessionDate: entry.sessionDate,
    requestMessage: entry.requestMessage,
  };
}

export async function fetchActionableNotifications(
  input?: { userId?: string; limit?: number },
): Promise<Result<ActionableNotification[]>> {
  const limit = Math.max(1, Math.min(input?.limit ?? 100, 300));

  const [followResult, gymResult] = await Promise.all([
    fetchPendingIncomingFollowRequests({
      userId: input?.userId,
      limit,
      cursor: 0,
    }),
    fetchPendingGymSessionValidationRequests({
      userId: input?.userId,
      limit,
    }),
  ]);

  if (followResult.error || gymResult.error) {
    const message = [followResult.error, gymResult.error]
      .filter((entry): entry is string => Boolean(entry))
      .join(" ");
    return fail(message || "Couldn't load notifications.");
  }

  const followItems = (followResult.data?.items ?? []).map(mapFollowRequestNotification);
  const gymItems = (gymResult.data ?? []).map(mapGymValidationNotification);

  const merged = [...followItems, ...gymItems].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  return ok(merged.slice(0, limit));
}

export async function fetchActionableNotificationCount(
  userId?: string,
): Promise<Result<{ count: number }>> {
  const [followCountResult, gymCountResult] = await Promise.all([
    fetchPendingIncomingFollowRequestCount(userId),
    fetchPendingGymSessionValidationRequestCount(userId),
  ]);

  if (followCountResult.error || gymCountResult.error) {
    const message = [followCountResult.error, gymCountResult.error]
      .filter((entry): entry is string => Boolean(entry))
      .join(" ");
    return fail(message || "Couldn't load notification count.");
  }

  return ok({
    count: (followCountResult.data?.count ?? 0) + (gymCountResult.data?.count ?? 0),
  });
}
