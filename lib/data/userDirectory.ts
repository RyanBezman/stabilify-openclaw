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
  const { data, error } = await supabase
    .from("profile_directory")
    .select(
      "user_id, username, display_name, bio, avatar_path, account_visibility, progress_visibility, updated_at",
    )
    .ilike("username", `${prefix}%`)
    .order("username", { ascending: true })
    .range(range.from, range.to);

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
