import { supabase } from "../supabase";
import type { PostRow, ShareVisibility } from "./types";
import { isLikelyUri, mergePhotoMediaUrls, parseLegacyPhotoBody } from "./postPhotoPayload";
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

export const POST_BODY_MAX_CHARS = 280;
const POST_PHOTOS_BUCKET = "post-photos";
const POST_PHOTO_SIGNED_URL_TTL_SECONDS = 60 * 60;
const MAX_PHOTO_POST_MEDIA = 4;

type FetchCurrentUserPostsInput = CursorPaginationInput & {
  userId?: string;
};
type FetchVisiblePostsInput = CursorPaginationInput & {
  userId?: string;
};
type FetchVisiblePostsByAuthorInput = CursorPaginationInput & {
  authorUserId: string;
  userId?: string;
};
type CreateCurrentUserTextPostInput = {
  userId?: string;
  closeFriendsOnly?: boolean;
};
type PhotoUploadInput = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  base64?: string | null;
};
type CreateCurrentUserPhotoPostInput = {
  photos: PhotoUploadInput[];
  caption?: string;
  userId?: string;
  closeFriendsOnly?: boolean;
};
type MappedPostRow = Omit<PostRow, "mediaUrls"> & {
  mediaPaths: string[];
};

export type VisibleFeedPostRow = PostRow & {
  authorDisplayName: string;
  authorAvatarPath: string | null;
};

function base64ToBytes(base64: string): Uint8Array | null {
  const clean = base64.trim();
  if (!clean) return null;

  const decoder = globalThis.atob;
  if (!decoder) return null;

  const binary = decoder(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function normalizeUniqueValues(values: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const rawValue of values) {
    const value = rawValue.trim();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    next.push(value);
  }
  return next.slice(0, MAX_PHOTO_POST_MEDIA);
}

function resolveUploadMeta(options?: { mimeType?: string | null; fileName?: string | null }) {
  const normalizedMime =
    typeof options?.mimeType === "string" && options.mimeType.startsWith("image/")
      ? options.mimeType
      : "image/jpeg";

  const fileName = options?.fileName?.trim() ?? "";
  const fileExtFromName = fileName.includes(".")
    ? fileName.split(".").pop()?.toLowerCase()
    : null;
  const fileExtFromMime = normalizedMime.replace("image/", "").toLowerCase();

  const rawExt = fileExtFromName || fileExtFromMime || "jpg";
  const extension = rawExt === "jpeg" ? "jpg" : rawExt;

  return {
    contentType: normalizedMime,
    extension,
  };
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

function mapPostRow(entry: {
  id: string;
  author_user_id: string;
  post_type: "text" | "photo";
  body: string | null;
  media_paths: string[] | null;
  visibility: "private" | "close_friends" | "followers" | "public";
  created_at: string;
}): MappedPostRow {
  return {
    id: entry.id,
    authorUserId: entry.author_user_id,
    postType: entry.post_type,
    body: entry.body ?? null,
    mediaPaths: entry.media_paths ?? [],
    visibility: entry.visibility,
    createdAt: entry.created_at,
  };
}

async function hydrateMappedPhotoPost(post: MappedPostRow): Promise<PostRow> {
  if (post.postType !== "photo") {
    return {
      id: post.id,
      authorUserId: post.authorUserId,
      postType: post.postType,
      body: post.body,
      mediaUrls: [],
      visibility: post.visibility,
      createdAt: post.createdAt,
    };
  }

  const legacy = parseLegacyPhotoBody(post.body);
  const caption = legacy?.caption ?? post.body;
  const mediaPaths = normalizeUniqueValues([...(post.mediaPaths ?? []), ...(legacy?.mediaPaths ?? [])]);
  const legacyUrls = legacy?.mediaUrls ?? [];
  const resolvedUrls: string[] = [];

  await Promise.all(
    mediaPaths.map(async (path) => {
      if (isLikelyUri(path)) {
        resolvedUrls.push(path);
        return;
      }

      const { data, error } = await supabase.storage
        .from(POST_PHOTOS_BUCKET)
        .createSignedUrl(path, POST_PHOTO_SIGNED_URL_TTL_SECONDS);
      if (!error && data?.signedUrl) {
        resolvedUrls.push(data.signedUrl);
      }
    }),
  );

  return {
    id: post.id,
    authorUserId: post.authorUserId,
    postType: post.postType,
    body: caption,
    mediaUrls: mergePhotoMediaUrls({ mediaUrls: legacyUrls, resolvedUrls }),
    visibility: post.visibility,
    createdAt: post.createdAt,
  };
}

async function hydrateMappedPosts(posts: MappedPostRow[]): Promise<PostRow[]> {
  return Promise.all(posts.map(hydrateMappedPhotoPost));
}

async function resolveCurrentUserPostVisibility(
  userId: string,
  closeFriendsOnly: boolean,
): Promise<Result<{ visibility: ShareVisibility }>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("account_visibility")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return fail(error);
  }

  const accountVisibility = data?.account_visibility;
  if (closeFriendsOnly) {
    return ok({ visibility: "close_friends" });
  }
  if (accountVisibility === "public" || accountVisibility === "followers") {
    return ok({ visibility: "public" });
  }

  return ok({ visibility: "followers" });
}

async function resolveUploadBody(photo: PhotoUploadInput): Promise<Result<{ body: Blob | Uint8Array }>> {
  const base64 = photo.base64?.trim();
  if (base64) {
    const bytes = base64ToBytes(base64);
    if (!bytes || bytes.byteLength === 0) {
      return fail("Couldn't decode selected photo bytes.");
    }
    return ok({ body: bytes });
  }

  const response = await fetch(photo.uri);
  if (!response.ok) {
    return fail(`Couldn't read selected photo (status ${response.status}).`);
  }
  const blob = await response.blob();
  if (!blob || blob.size === 0) {
    return fail("Selected photo is empty (0 bytes).");
  }

  return ok({ body: blob });
}

function extractPhotoStoragePaths(post: { media_paths?: string[] | null; body?: string | null }) {
  const legacy = parseLegacyPhotoBody(post.body ?? null);
  return normalizeUniqueValues([
    ...(post.media_paths ?? []),
    ...(legacy?.mediaPaths ?? []),
  ]).filter((path) => !isLikelyUri(path));
}

export async function fetchCurrentUserPostCount(userId?: string): Promise<Result<{ count: number }>> {
  const userResult = await getCurrentUserId(userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }

  const resolvedUserId = userResult.data.userId;
  const { count, error } = await supabase
    .from("posts")
    .select("id", { head: true, count: "exact" })
    .eq("author_user_id", resolvedUserId);

  if (error) {
    return fail(error);
  }

  return ok({ count: count ?? 0 });
}

export async function fetchCurrentUserPosts(
  input?: FetchCurrentUserPostsInput,
): Promise<Result<PaginatedItems<PostRow>>> {
  const userResult = await getCurrentUserId(input?.userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }
  const resolvedUserId = userResult.data.userId;
  const pagination = normalizeCursorPagination(input, { defaultLimit: 10, maxLimit: 50 });
  const range = toSupabaseRange(pagination);

  const { data, error } = await supabase
    .from("posts")
    .select("id, author_user_id, post_type, body, media_paths, visibility, created_at")
    .eq("author_user_id", resolvedUserId)
    .order("created_at", { ascending: false })
    .range(range.from, range.to);

  if (error) {
    return fail(error);
  }

  const mappedPosts = (data ?? []).map(mapPostRow);
  const hydratedPosts = await hydrateMappedPosts(mappedPosts);
  return ok(toPaginatedItems(hydratedPosts, pagination));
}

export async function fetchVisiblePostsForCurrentUser(
  input?: FetchVisiblePostsInput,
): Promise<Result<PaginatedItems<VisibleFeedPostRow>>> {
  const userResult = await getCurrentUserId(input?.userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }

  const pagination = normalizeCursorPagination(input, { defaultLimit: 10, maxLimit: 50 });
  const range = toSupabaseRange(pagination);

  const { data, error } = await supabase
    .from("posts")
    .select("id, author_user_id, post_type, body, media_paths, visibility, created_at")
    .order("created_at", { ascending: false })
    .range(range.from, range.to);

  if (error) {
    return fail(error);
  }

  const mappedPosts = await hydrateMappedPosts((data ?? []).map(mapPostRow));
  const authorUserIds = [...new Set(mappedPosts.map((post) => post.authorUserId))];
  if (authorUserIds.length === 0) {
    return ok(toPaginatedItems([], pagination));
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_path")
    .in("id", authorUserIds);
  if (profileError) {
    return fail(profileError);
  }

  const profileById = new Map(
    (profileData ?? []).map((profile) => [
      profile.id,
      {
        displayName: profile.display_name,
        avatarPath: profile.avatar_path ?? null,
      },
    ]),
  );

  const items = mappedPosts.map((post) => {
    const profile = profileById.get(post.authorUserId);
    const fallbackName = `User ${post.authorUserId.slice(0, 8)}`;
    return {
      ...post,
      authorDisplayName: profile?.displayName?.trim() || fallbackName,
      authorAvatarPath: profile?.avatarPath ?? null,
    };
  });

  return ok(toPaginatedItems(items, pagination));
}

export async function fetchVisiblePostsByAuthorForCurrentUser(
  input: FetchVisiblePostsByAuthorInput,
): Promise<Result<PaginatedItems<PostRow>>> {
  const userResult = await getCurrentUserId(input.userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }

  const authorUserId = input.authorUserId.trim();
  if (!authorUserId) {
    return fail("Author is required.", { code: "VALIDATION" });
  }

  const pagination = normalizeCursorPagination(input, { defaultLimit: 10, maxLimit: 50 });
  const range = toSupabaseRange(pagination);

  const { data, error } = await supabase
    .from("posts")
    .select("id, author_user_id, post_type, body, media_paths, visibility, created_at")
    .eq("author_user_id", authorUserId)
    .order("created_at", { ascending: false })
    .range(range.from, range.to);

  if (error) {
    return fail(error);
  }

  const mappedPosts = (data ?? []).map(mapPostRow);
  const hydratedPosts = await hydrateMappedPosts(mappedPosts);
  return ok(toPaginatedItems(hydratedPosts, pagination));
}

export async function createCurrentUserTextPost(
  bodyInput: string,
  input?: CreateCurrentUserTextPostInput,
): Promise<Result<{ post: PostRow }>> {
  const body = bodyInput.trim();
  if (!body) {
    return fail("Post can't be empty.", { code: "VALIDATION" });
  }
  if (body.length > POST_BODY_MAX_CHARS) {
    return fail(`Post can't exceed ${POST_BODY_MAX_CHARS} characters.`, {
      code: "VALIDATION",
    });
  }

  const userResult = await getCurrentUserId(input?.userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }
  const resolvedUserId = userResult.data.userId;
  const visibilityResult = await resolveCurrentUserPostVisibility(
    resolvedUserId,
    input?.closeFriendsOnly ?? false,
  );
  if (visibilityResult.error || !visibilityResult.data) {
    return fail(visibilityResult.error ?? "Couldn't resolve post visibility.");
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_user_id: resolvedUserId,
      post_type: "text",
      body,
      media_paths: null,
      visibility: visibilityResult.data.visibility,
    })
    .select("id, author_user_id, post_type, body, media_paths, visibility, created_at")
    .single();

  if (error) {
    return fail(error);
  }

  const mappedPost = mapPostRow(data);
  const hydratedPost = (await hydrateMappedPosts([mappedPost]))[0];
  return ok({ post: hydratedPost });
}

export async function createCurrentUserPhotoPost(
  input: CreateCurrentUserPhotoPostInput,
): Promise<Result<{ post: PostRow }>> {
  const photos = input.photos
    .map((photo) => ({ ...photo, uri: photo.uri.trim() }))
    .filter((photo) => photo.uri.length > 0)
    .slice(0, MAX_PHOTO_POST_MEDIA);
  if (photos.length === 0) {
    return fail("At least one photo is required.", { code: "VALIDATION" });
  }

  const caption = (input.caption ?? "").trim();
  if (caption.length > POST_BODY_MAX_CHARS) {
    return fail(`Caption can't exceed ${POST_BODY_MAX_CHARS} characters.`, {
      code: "VALIDATION",
    });
  }

  const userResult = await getCurrentUserId(input.userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }
  const resolvedUserId = userResult.data.userId;
  const visibilityResult = await resolveCurrentUserPostVisibility(
    resolvedUserId,
    input.closeFriendsOnly ?? false,
  );
  if (visibilityResult.error || !visibilityResult.data) {
    return fail(visibilityResult.error ?? "Couldn't resolve post visibility.");
  }

  const uploadResults = await Promise.all(
    photos.map(async (photo, index) => {
      const fileMeta = resolveUploadMeta({
        mimeType: photo.mimeType,
        fileName: photo.fileName,
      });
      const storagePath = `${resolvedUserId}/post-${Date.now()}-${index}.${fileMeta.extension}`;
      const uploadBodyResult = await resolveUploadBody(photo);
      if (uploadBodyResult.error || !uploadBodyResult.data) {
        return fail(uploadBodyResult.error ?? "Couldn't read selected photo.");
      }

      const { error: uploadError } = await supabase.storage
        .from(POST_PHOTOS_BUCKET)
        .upload(storagePath, uploadBodyResult.data.body, {
          contentType: fileMeta.contentType,
          upsert: true,
        });
      if (uploadError) {
        return fail(uploadError);
      }
      return { storagePath };
    }),
  );

  const failedUpload = uploadResults.find((result) => "error" in result);
  if (failedUpload && "error" in failedUpload) {
    const uploadedPathsBeforeFailure = uploadResults
      .filter((result): result is { storagePath: string } => "storagePath" in result)
      .map((result) => result.storagePath);
    if (uploadedPathsBeforeFailure.length > 0) {
      await supabase.storage.from(POST_PHOTOS_BUCKET).remove(uploadedPathsBeforeFailure);
    }
    return fail(failedUpload.error);
  }

  const mediaPaths = normalizeUniqueValues(
    uploadResults
      .filter((result): result is { storagePath: string } => "storagePath" in result)
      .map((result) => result.storagePath),
  );

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_user_id: resolvedUserId,
      post_type: "photo",
      body: caption || null,
      media_paths: mediaPaths,
      visibility: visibilityResult.data.visibility,
    })
    .select("id, author_user_id, post_type, body, media_paths, visibility, created_at")
    .single();
  if (error) {
    if (mediaPaths.length > 0) {
      await supabase.storage.from(POST_PHOTOS_BUCKET).remove(mediaPaths);
    }
    return fail(error);
  }

  const mappedPost = mapPostRow(data);
  const hydratedPost = (await hydrateMappedPosts([mappedPost]))[0];
  return ok({ post: hydratedPost });
}

export async function deleteCurrentUserPost(postId: string, userId?: string): Promise<Result<{ ok: true }>> {
  const resolvedPostId = postId.trim();
  if (!resolvedPostId) {
    return fail("Post ID is required.", { code: "VALIDATION" });
  }

  const userResult = await getCurrentUserId(userId);
  if (userResult.error || !userResult.data) {
    return fail(userResult.error ?? "Missing user session.");
  }
  const resolvedUserId = userResult.data.userId;

  const { data: existingPost, error: existingPostError } = await supabase
    .from("posts")
    .select("post_type, body, media_paths")
    .eq("id", resolvedPostId)
    .eq("author_user_id", resolvedUserId)
    .maybeSingle();
  if (existingPostError) {
    return fail(existingPostError);
  }

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", resolvedPostId)
    .eq("author_user_id", resolvedUserId);

  if (error) {
    return fail(error);
  }

  if (existingPost?.post_type === "photo") {
    const mediaPaths = extractPhotoStoragePaths(existingPost);
    if (mediaPaths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(POST_PHOTOS_BUCKET)
        .remove(mediaPaths);
      if (removeError) {
        return fail(`Post deleted, but media cleanup failed: ${removeError.message}`);
      }
    }
  }

  return ok({ ok: true });
}
