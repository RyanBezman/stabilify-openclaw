import type { AccountVisibility, ProgressVisibility } from "./types";
import { supabase } from "../supabase";
import { normalizeUsername } from "../utils/username";
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

type ProfileDirectoryRecord = {
  user_id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_path: string | null;
  account_visibility: AccountVisibility;
  progress_visibility: ProgressVisibility;
  updated_at: string;
};

type BlockedRelationshipRecord = {
  followed_user_id: string;
};

export type UserDirectoryRow = {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarPath: string | null;
  accountVisibility: AccountVisibility;
  progressVisibility: ProgressVisibility;
  updatedAt: string;
};

function mapProfileDirectoryRow(entry: ProfileDirectoryRecord): UserDirectoryRow {
  return {
    userId: entry.user_id,
    username: entry.username,
    displayName: entry.display_name,
    bio: entry.bio ?? "",
    avatarPath: entry.avatar_path ?? null,
    accountVisibility: entry.account_visibility,
    progressVisibility: entry.progress_visibility,
    updatedAt: entry.updated_at,
  };
}

async function fetchBlockedUserIds(): Promise<Result<string[]>> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    return fail(userError);
  }

  const currentUserId = userData.user?.id;
  if (!currentUserId) {
    return fail("Missing user session.", { code: "SESSION_REQUIRED" });
  }

  const { data, error } = await supabase
    .from("follows")
    .select("followed_user_id")
    .eq("follower_user_id", currentUserId)
    .eq("status", "blocked");

  if (error) {
    return fail(error);
  }

  return ok(
    (data ?? []).map((entry) => (entry as BlockedRelationshipRecord).followed_user_id).filter(Boolean),
  );
}

export async function searchUsersByUsernamePrefix(
  query: string,
  input?: CursorPaginationInput,
): Promise<Result<PaginatedItems<UserDirectoryRow>>> {
  const prefix = normalizeUsername(query);
  if (!prefix) {
    return ok({ items: [], nextCursor: null, hasMore: false });
  }

  const pagination = normalizeCursorPagination(input, { defaultLimit: 20, maxLimit: 50 });
  const range = toSupabaseRange(pagination);
  const blockedUserIdsResult = await fetchBlockedUserIds();
  if (blockedUserIdsResult.error) {
    return fail(blockedUserIdsResult.error);
  }

  let directoryQuery = supabase
    .from("profile_directory")
    .select(
      "user_id, username, display_name, bio, avatar_path, account_visibility, progress_visibility, updated_at",
    )
    .ilike("username", `${prefix}%`)
    .order("username", { ascending: true });

  const blockedUserIds = blockedUserIdsResult.data ?? [];
  if (blockedUserIds.length > 0) {
    directoryQuery = directoryQuery.not("user_id", "in", `(${blockedUserIds.join(",")})`);
  }

  const { data, error } = await directoryQuery.range(range.from, range.to);

  if (error) {
    return fail(error);
  }

  const items = (data ?? []).map((entry) => mapProfileDirectoryRow(entry as ProfileDirectoryRecord));
  return ok(toPaginatedItems(items, pagination));
}

export async function fetchUserDirectoryById(userId: string): Promise<Result<UserDirectoryRow>> {
  const resolvedUserId = userId.trim();
  if (!resolvedUserId) {
    return fail("User is required.", { code: "VALIDATION" });
  }

  const { data, error } = await supabase
    .from("profile_directory")
    .select(
      "user_id, username, display_name, bio, avatar_path, account_visibility, progress_visibility, updated_at",
    )
    .eq("user_id", resolvedUserId)
    .maybeSingle();

  if (error) {
    return fail(error);
  }
  if (!data) {
    return fail("User not found.", { code: "NOT_FOUND" });
  }

  return ok(mapProfileDirectoryRow(data as ProfileDirectoryRecord));
}
