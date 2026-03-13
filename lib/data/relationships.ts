import { supabase } from "../supabase";
import type { CloseFriendRow, FollowRow, FollowStatus } from "./types";
import type { UserDirectoryRow } from "./userDirectory";
import {
  fail,
  normalizeCursorPagination,
  ok,
  toPaginatedItems,
  toSupabaseRange,
  type CursorPaginationInput,
  type PaginatedItems,
  type Result,
} from "../features/shared";

type FetchListInput = CursorPaginationInput & {
  userId?: string;
  status?: FollowStatus;
};

type BlockUserRpcRow = {
  blocked_user_id: string;
  status: FollowStatus;
};

type UnblockUserRpcRow = {
  unblocked_user_id: string;
  removed: boolean;
};

export type RelationshipCounts = {
  followers: number;
  following: number;
  closeFriends: number;
};

export type PublicRelationshipCounts = {
  followers: number;
  following: number;
};

export type ViewerFollowState = "none" | FollowStatus;

export type PendingIncomingFollowRequest = {
  requestId: string;
  requesterUserId: string;
  status: FollowStatus;
  createdAt: string;
  updatedAt: string;
  requesterDisplayName: string;
  requesterUsername: string;
  requesterAvatarPath: string | null;
};

export type CloseFriendProfile = CloseFriendRow &
  Pick<UserDirectoryRow, "avatarPath" | "bio" | "displayName" | "username">;

export type BlockedProfile = FollowRow &
  Pick<UserDirectoryRow, "avatarPath" | "bio" | "displayName" | "username">;

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

function mapFollowRow(entry: {
  id: string;
  follower_user_id: string;
  followed_user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}): FollowRow {
  return {
    id: entry.id,
    followerUserId: entry.follower_user_id,
    followedUserId: entry.followed_user_id,
    status: entry.status as FollowStatus,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  };
}

async function resolveTargetVisibility(targetUserId: string): Promise<Result<{ accountVisibility: "private" | "public" }>> {
  const { data, error } = await supabase
    .from("profile_directory")
    .select("account_visibility")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (error) {
    return fail(error);
  }
  if (!data) {
    return fail("Target profile not found.", { code: "NOT_FOUND" });
  }

  const accountVisibility = data.account_visibility === "public" ? "public" : "private";
  return ok({ accountVisibility });
}

export async function fetchRelationshipCounts(userId?: string): Promise<Result<RelationshipCounts>> {
  const userResult = await getCurrentUserId(userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }

  const resolvedUserId = userResult.data.userId;
  const [followersRes, followingRes, closeFriendsRes] = await Promise.all([
    supabase
      .from("follows")
      .select("id", { head: true, count: "exact" })
      .eq("followed_user_id", resolvedUserId)
      .eq("status", "accepted"),
    supabase
      .from("follows")
      .select("id", { head: true, count: "exact" })
      .eq("follower_user_id", resolvedUserId)
      .eq("status", "accepted"),
    supabase
      .from("close_friends")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", resolvedUserId),
  ]);

  if (followersRes.error) {
    return fail(followersRes.error);
  }
  if (followingRes.error) {
    return fail(followingRes.error);
  }
  if (closeFriendsRes.error) {
    return fail(closeFriendsRes.error);
  }

  return ok({
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
    closeFriends: closeFriendsRes.count ?? 0,
  });
}

export async function fetchPublicRelationshipCounts(
  targetUserId: string,
): Promise<Result<PublicRelationshipCounts>> {
  const resolvedTargetUserId = targetUserId.trim();
  if (!resolvedTargetUserId) {
    return fail("Target user is required.", { code: "VALIDATION" });
  }

  const [followersRes, followingRes] = await Promise.all([
    supabase
      .from("follows")
      .select("id", { head: true, count: "exact" })
      .eq("followed_user_id", resolvedTargetUserId)
      .eq("status", "accepted"),
    supabase
      .from("follows")
      .select("id", { head: true, count: "exact" })
      .eq("follower_user_id", resolvedTargetUserId)
      .eq("status", "accepted"),
  ]);

  if (followersRes.error) {
    return fail(followersRes.error);
  }
  if (followingRes.error) {
    return fail(followingRes.error);
  }

  return ok({
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
  });
}

export async function fetchViewerFollowState(targetUserId: string): Promise<Result<{ status: ViewerFollowState }>> {
  const cleanTargetUserId = targetUserId.trim();
  if (!cleanTargetUserId) {
    return fail("Target user is required.", { code: "VALIDATION" });
  }

  const userResult = await getCurrentUserId();
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }
  const currentUserId = userResult.data.userId;

  if (cleanTargetUserId === currentUserId) {
    return ok({ status: "none" });
  }

  const { data, error } = await supabase
    .from("follows")
    .select("status")
    .eq("follower_user_id", currentUserId)
    .eq("followed_user_id", cleanTargetUserId)
    .maybeSingle();

  if (error) {
    return fail(error);
  }

  return ok({
    status: (data?.status as FollowStatus | undefined) ?? "none",
  });
}

export async function followUser(
  targetUserId: string,
): Promise<Result<{ ok: true; status: Exclude<FollowStatus, "rejected"> }>> {
  const cleanTargetUserId = targetUserId.trim();
  if (!cleanTargetUserId) {
    return fail("Target user is required.", { code: "VALIDATION" });
  }

  const userResult = await getCurrentUserId();
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }
  const currentUserId = userResult.data.userId;

  if (cleanTargetUserId === currentUserId) {
    return fail("You can't follow yourself.", { code: "VALIDATION" });
  }

  const currentState = await fetchViewerFollowState(cleanTargetUserId);
  if (currentState.error) {
    return fail(currentState.error);
  }

  if (currentState.data?.status === "blocked") {
    return fail("Follow unavailable for this account.");
  }

  const { data: blockedByTargetRow, error: blockedByTargetError } = await supabase
    .from("follows")
    .select("status")
    .eq("follower_user_id", cleanTargetUserId)
    .eq("followed_user_id", currentUserId)
    .maybeSingle();

  if (blockedByTargetError) {
    return fail(blockedByTargetError);
  }

  if (blockedByTargetRow?.status === "blocked") {
    return fail("Follow unavailable for this account.");
  }

  const visibilityResult = await resolveTargetVisibility(cleanTargetUserId);
  if (visibilityResult.error || !visibilityResult.data) {
    return fail(visibilityResult.error ?? "Couldn't resolve target profile.");
  }

  const nextStatus: Exclude<FollowStatus, "rejected"> =
    visibilityResult.data.accountVisibility === "public" ? "accepted" : "pending";

  const { error } = await supabase.from("follows").upsert(
    {
      follower_user_id: currentUserId,
      followed_user_id: cleanTargetUserId,
      status: nextStatus,
    },
    { onConflict: "follower_user_id,followed_user_id" },
  );

  if (error) {
    return fail(error);
  }

  return ok({ ok: true, status: nextStatus });
}

async function sendFollowRequest(targetUserId: string): Promise<Result<{ ok: true }>> {
  const result = await followUser(targetUserId);
  if (result.error) {
    return fail(result.error);
  }

  return ok({ ok: true });
}

export async function respondToFollowRequest(
  requesterUserId: string,
  action: "accept" | "reject",
): Promise<Result<{ ok: true }>> {
  const cleanRequesterUserId = requesterUserId.trim();
  if (!cleanRequesterUserId) {
    return fail("Requester user is required.", { code: "VALIDATION" });
  }

  const userResult = await getCurrentUserId();
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }
  const currentUserId = userResult.data.userId;
  const nextStatus: FollowStatus = action === "accept" ? "accepted" : "rejected";

  const { error } = await supabase
    .from("follows")
    .update({ status: nextStatus })
    .eq("follower_user_id", cleanRequesterUserId)
    .eq("followed_user_id", currentUserId)
    .eq("status", "pending");

  if (error) {
    return fail(error);
  }

  return ok({ ok: true });
}

export async function unfollowUser(targetUserId: string): Promise<Result<{ ok: true }>> {
  const cleanTargetUserId = targetUserId.trim();
  if (!cleanTargetUserId) {
    return fail("Target user is required.", { code: "VALIDATION" });
  }

  const userResult = await getCurrentUserId();
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }
  const currentUserId = userResult.data.userId;

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_user_id", currentUserId)
    .eq("followed_user_id", cleanTargetUserId);

  if (error) {
    return fail(error);
  }

  return ok({ ok: true });
}

export async function cancelFollowRequest(targetUserId: string): Promise<Result<{ ok: true }>> {
  const cleanTargetUserId = targetUserId.trim();
  if (!cleanTargetUserId) {
    return fail("Target user is required.", { code: "VALIDATION" });
  }

  const userResult = await getCurrentUserId();
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }
  const currentUserId = userResult.data.userId;

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_user_id", currentUserId)
    .eq("followed_user_id", cleanTargetUserId)
    .eq("status", "pending");

  if (error) {
    return fail(error);
  }

  return ok({ ok: true });
}

async function removeFollower(followerUserId: string): Promise<Result<{ ok: true }>> {
  const cleanFollowerUserId = followerUserId.trim();
  if (!cleanFollowerUserId) {
    return fail("Follower user is required.", { code: "VALIDATION" });
  }

  const userResult = await getCurrentUserId();
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }
  const currentUserId = userResult.data.userId;

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_user_id", cleanFollowerUserId)
    .eq("followed_user_id", currentUserId);

  if (error) {
    return fail(error);
  }

  return ok({ ok: true });
}

export async function blockUser(
  targetUserId: string,
): Promise<Result<{ blockedUserId: string; ok: true; status: "blocked" }>> {
  const cleanTargetUserId = targetUserId.trim();
  if (!cleanTargetUserId) {
    return fail("Target user is required.", { code: "VALIDATION" });
  }

  const { data, error } = await supabase.rpc("block_user", {
    target_user_id: cleanTargetUserId,
  });

  if (error) {
    return fail(error);
  }

  const row = (Array.isArray(data) ? data[0] : null) as BlockUserRpcRow | null;
  if (!row?.blocked_user_id || row.status !== "blocked") {
    return fail("Couldn't block this user.");
  }

  return ok({
    blockedUserId: row.blocked_user_id,
    ok: true,
    status: "blocked",
  });
}

export async function unblockUser(
  targetUserId: string,
): Promise<Result<{ ok: true; removed: boolean; unblockedUserId: string }>> {
  const cleanTargetUserId = targetUserId.trim();
  if (!cleanTargetUserId) {
    return fail("Target user is required.", { code: "VALIDATION" });
  }

  const { data, error } = await supabase.rpc("unblock_user", {
    target_user_id: cleanTargetUserId,
  });

  if (error) {
    return fail(error);
  }

  const row = (Array.isArray(data) ? data[0] : null) as UnblockUserRpcRow | null;
  if (!row?.unblocked_user_id) {
    return fail("Couldn't unblock this user.");
  }

  return ok({
    ok: true,
    removed: row.removed,
    unblockedUserId: row.unblocked_user_id,
  });
}

async function fetchFollowers(input?: FetchListInput): Promise<Result<PaginatedItems<FollowRow>>> {
  const userResult = await getCurrentUserId(input?.userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }
  const resolvedUserId = userResult.data.userId;
  const pagination = normalizeCursorPagination(input, { defaultLimit: 50, maxLimit: 200 });
  const range = toSupabaseRange(pagination);
  const status = input?.status ?? "accepted";

  const { data, error } = await supabase
    .from("follows")
    .select("id, follower_user_id, followed_user_id, status, created_at, updated_at")
    .eq("followed_user_id", resolvedUserId)
    .eq("status", status)
    .order("updated_at", { ascending: false })
    .range(range.from, range.to);

  if (error) {
    return fail(error);
  }

  return ok(toPaginatedItems((data ?? []).map(mapFollowRow), pagination));
}

async function fetchFollowing(input?: FetchListInput): Promise<Result<PaginatedItems<FollowRow>>> {
  const userResult = await getCurrentUserId(input?.userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }
  const resolvedUserId = userResult.data.userId;
  const pagination = normalizeCursorPagination(input, { defaultLimit: 50, maxLimit: 200 });
  const range = toSupabaseRange(pagination);
  const status = input?.status ?? "accepted";

  const { data, error } = await supabase
    .from("follows")
    .select("id, follower_user_id, followed_user_id, status, created_at, updated_at")
    .eq("follower_user_id", resolvedUserId)
    .eq("status", status)
    .order("updated_at", { ascending: false })
    .range(range.from, range.to);

  if (error) {
    return fail(error);
  }

  return ok(toPaginatedItems((data ?? []).map(mapFollowRow), pagination));
}

type FetchPendingIncomingFollowRequestsInput = CursorPaginationInput & {
  userId?: string;
};

export async function fetchPendingIncomingFollowRequests(
  input?: FetchPendingIncomingFollowRequestsInput,
): Promise<Result<PaginatedItems<PendingIncomingFollowRequest>>> {
  const userResult = await getCurrentUserId(input?.userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }

  const currentUserId = userResult.data.userId;
  const pagination = normalizeCursorPagination(input, { defaultLimit: 50, maxLimit: 200 });
  const range = toSupabaseRange(pagination);

  const { data, error } = await supabase
    .from("follows")
    .select("id, follower_user_id, status, created_at, updated_at")
    .eq("followed_user_id", currentUserId)
    .eq("status", "pending")
    .order("updated_at", { ascending: false })
    .range(range.from, range.to);

  if (error) {
    return fail(error);
  }

  const rows =
    data?.map((entry) => ({
      requestId: entry.id,
      requesterUserId: entry.follower_user_id,
      status: entry.status as FollowStatus,
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
    })) ?? [];

  if (rows.length === 0) {
    return ok(toPaginatedItems([], pagination));
  }

  const requesterIds = rows.map((entry) => entry.requesterUserId);
  const { data: profileData, error: profileError } = await supabase
    .from("profile_directory")
    .select("user_id, username, display_name, avatar_path")
    .in("user_id", requesterIds);

  if (profileError) {
    return fail(profileError);
  }

  const profileById = new Map(
    (profileData ?? []).map((profile) => [
      profile.user_id,
      {
        username: profile.username as string,
        displayName: profile.display_name as string,
        avatarPath: (profile.avatar_path as string | null) ?? null,
      },
    ]),
  );

  const items = rows.map((entry) => {
    const profile = profileById.get(entry.requesterUserId);
    return {
      ...entry,
      requesterDisplayName:
        profile?.displayName?.trim() || `User ${entry.requesterUserId.slice(0, 8)}`,
      requesterUsername:
        profile?.username?.trim() || `user${entry.requesterUserId.slice(0, 8)}`,
      requesterAvatarPath: profile?.avatarPath ?? null,
    };
  });

  return ok(toPaginatedItems(items, pagination));
}

export async function fetchPendingIncomingFollowRequestCount(
  userId?: string,
): Promise<Result<{ count: number }>> {
  const userResult = await getCurrentUserId(userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }

  const currentUserId = userResult.data.userId;
  const { count, error } = await supabase
    .from("follows")
    .select("id", { head: true, count: "exact" })
    .eq("followed_user_id", currentUserId)
    .eq("status", "pending");

  if (error) {
    return fail(error);
  }

  return ok({ count: count ?? 0 });
}

async function addCloseFriend(friendUserId: string): Promise<Result<{ ok: true }>> {
  const cleanFriendUserId = friendUserId.trim();
  if (!cleanFriendUserId) {
    return fail("Friend user is required.", { code: "VALIDATION" });
  }

  const userResult = await getCurrentUserId();
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }
  const currentUserId = userResult.data.userId;

  if (cleanFriendUserId === currentUserId) {
    return fail("You can't add yourself as a close friend.", { code: "VALIDATION" });
  }

  const { error } = await supabase.from("close_friends").upsert(
    {
      user_id: currentUserId,
      friend_user_id: cleanFriendUserId,
    },
    { onConflict: "user_id,friend_user_id" },
  );

  if (error) {
    return fail(error);
  }

  return ok({ ok: true });
}

export async function removeCloseFriend(friendUserId: string): Promise<Result<{ ok: true }>> {
  const cleanFriendUserId = friendUserId.trim();
  if (!cleanFriendUserId) {
    return fail("Friend user is required.", { code: "VALIDATION" });
  }

  const userResult = await getCurrentUserId();
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }
  const currentUserId = userResult.data.userId;

  const { error } = await supabase
    .from("close_friends")
    .delete()
    .eq("user_id", currentUserId)
    .eq("friend_user_id", cleanFriendUserId);

  if (error) {
    return fail(error);
  }

  return ok({ ok: true });
}

async function fetchCloseFriends(
  input?: { userId?: string } & CursorPaginationInput,
): Promise<Result<PaginatedItems<CloseFriendRow>>> {
  const userResult = await getCurrentUserId(input?.userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }
  const resolvedUserId = userResult.data.userId;
  const pagination = normalizeCursorPagination(input, { defaultLimit: 50, maxLimit: 200 });
  const range = toSupabaseRange(pagination);

  const { data, error } = await supabase
    .from("close_friends")
    .select("id, user_id, friend_user_id, created_at")
    .eq("user_id", resolvedUserId)
    .order("created_at", { ascending: false })
    .range(range.from, range.to);

  if (error) {
    return fail(error);
  }

  const items =
    data?.map((entry) => ({
      id: entry.id,
      userId: entry.user_id,
      friendUserId: entry.friend_user_id,
      createdAt: entry.created_at,
    })) ?? [];

  return ok(toPaginatedItems(items, pagination));
}

export async function fetchCloseFriendProfiles(
  input?: { userId?: string } & CursorPaginationInput,
): Promise<Result<PaginatedItems<CloseFriendProfile>>> {
  const closeFriendsResult = await fetchCloseFriends(input);
  if (closeFriendsResult.error || !closeFriendsResult.data) {
    return fail(closeFriendsResult.error ?? "Couldn't load close friends.");
  }

  const closeFriendPage = closeFriendsResult.data;
  if (closeFriendPage.items.length === 0) {
    return ok({
      items: [],
      nextCursor: closeFriendPage.nextCursor,
      hasMore: closeFriendPage.hasMore,
    });
  }

  const friendIds = closeFriendPage.items.map((entry) => entry.friendUserId);
  const { data, error } = await supabase
    .from("profile_directory")
    .select("user_id, username, display_name, bio, avatar_path")
    .in("user_id", friendIds);

  if (error) {
    return fail(error);
  }

  const profileById = new Map(
    (data ?? []).map((entry) => [
      entry.user_id as string,
      {
        username: entry.username as string,
        displayName: entry.display_name as string,
        bio: (entry.bio as string | null) ?? "",
        avatarPath: (entry.avatar_path as string | null) ?? null,
      },
    ]),
  );

  const items = closeFriendPage.items.map((entry) => {
    const profile = profileById.get(entry.friendUserId);
    const fallbackSuffix = entry.friendUserId.slice(0, 8);

    return {
      ...entry,
      username: profile?.username?.trim() || `user${fallbackSuffix}`,
      displayName: profile?.displayName?.trim() || `User ${fallbackSuffix}`,
      bio: profile?.bio ?? "",
      avatarPath: profile?.avatarPath ?? null,
    };
  });

  return ok({
    items,
    nextCursor: closeFriendPage.nextCursor,
    hasMore: closeFriendPage.hasMore,
  });
}

export async function fetchBlockedProfiles(
  input?: { userId?: string } & CursorPaginationInput,
): Promise<Result<PaginatedItems<BlockedProfile>>> {
  const blockedResult = await fetchFollowing({ ...input, status: "blocked" });
  if (blockedResult.error || !blockedResult.data) {
    return fail(blockedResult.error ?? "Couldn't load blocked accounts.");
  }

  const blockedPage = blockedResult.data;
  if (blockedPage.items.length === 0) {
    return ok({
      items: [],
      nextCursor: blockedPage.nextCursor,
      hasMore: blockedPage.hasMore,
    });
  }

  const blockedUserIds = blockedPage.items.map((entry) => entry.followedUserId);
  const { data, error } = await supabase
    .from("profile_directory")
    .select("user_id, username, display_name, bio, avatar_path")
    .in("user_id", blockedUserIds);

  if (error) {
    return fail(error);
  }

  const profileById = new Map(
    (data ?? []).map((entry) => [
      entry.user_id as string,
      {
        username: entry.username as string,
        displayName: entry.display_name as string,
        bio: (entry.bio as string | null) ?? "",
        avatarPath: (entry.avatar_path as string | null) ?? null,
      },
    ]),
  );

  const items = blockedPage.items.map((entry) => {
    const profile = profileById.get(entry.followedUserId);
    const fallbackSuffix = entry.followedUserId.slice(0, 8);

    return {
      ...entry,
      username: profile?.username?.trim() || `user${fallbackSuffix}`,
      displayName: profile?.displayName?.trim() || `User ${fallbackSuffix}`,
      bio: profile?.bio ?? "",
      avatarPath: profile?.avatarPath ?? null,
    };
  });

  return ok({
    items,
    nextCursor: blockedPage.nextCursor,
    hasMore: blockedPage.hasMore,
  });
}
