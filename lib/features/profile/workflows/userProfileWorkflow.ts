import { fetchDashboardData } from "../../../data/dashboard";
import {
  fetchCurrentUserPostCount,
  fetchVisiblePostsByAuthorForCurrentUser,
} from "../../../data/posts";
import {
  fetchPublicRelationshipCounts,
  fetchViewerFollowState,
  type ViewerFollowState,
} from "../../../data/relationships";
import { fetchUserDirectoryById, type UserDirectoryRow } from "../../../data/userDirectory";
import type { PostRow } from "../../../data/types";
import { fetchCurrentUserId } from "../../auth";
import { getProfilePhotoSignedUrl } from "../services/photo";

export type UserProfileDashboardState = Awaited<ReturnType<typeof fetchDashboardData>>["data"] | null;

type LoadUserProfileWorkflowOptions = {
  targetUserId: string;
  postsPageSize: number;
};

export type LoadUserProfileWorkflowResult =
  | {
      kind: "profile_error";
      error: string;
    }
  | {
      kind: "redirect_to_own_profile";
      currentUserId: string;
    }
  | {
      kind: "loaded";
      currentUserId: string;
      profile: UserDirectoryRow;
      profilePhotoUrl: string | null;
      followState: ViewerFollowState;
      followersCount: number;
      followingCount: number;
      postCount: number;
      postCountKnown: boolean;
      posts: PostRow[];
      postsNextCursor: number | null;
      hasMorePosts: boolean;
      postsError: string | null;
      dashboard: UserProfileDashboardState;
      progressError: string | null;
    };

export async function loadUserProfileWorkflow({
  targetUserId,
  postsPageSize,
}: LoadUserProfileWorkflowOptions): Promise<LoadUserProfileWorkflowResult> {
  const authResult = await fetchCurrentUserId();
  const viewerId = authResult.data?.userId ?? null;
  if (authResult.error || !viewerId) {
    return {
      kind: "profile_error",
      error: authResult.error ?? "Missing user session.",
    };
  }

  if (viewerId === targetUserId) {
    return {
      kind: "redirect_to_own_profile",
      currentUserId: viewerId,
    };
  }

  const [
    profileResult,
    followStateResult,
    relationshipCountsResult,
    postCountResult,
    postsResult,
    dashboardResult,
  ] = await Promise.all([
    fetchUserDirectoryById(targetUserId),
    fetchViewerFollowState(targetUserId),
    fetchPublicRelationshipCounts(targetUserId),
    fetchCurrentUserPostCount(targetUserId),
    fetchVisiblePostsByAuthorForCurrentUser({
      authorUserId: targetUserId,
      limit: postsPageSize,
      cursor: 0,
    }),
    fetchDashboardData(targetUserId),
  ]);

  if (profileResult.error || !profileResult.data) {
    return {
      kind: "profile_error",
      error: profileResult.error ?? "Couldn't load profile.",
    };
  }

  const profile = profileResult.data;
  let profilePhotoUrl: string | null = null;
  if (profile.avatarPath) {
    const signedUrlResult = await getProfilePhotoSignedUrl(profile.avatarPath);
    profilePhotoUrl = signedUrlResult.data?.signedUrl ?? null;
  }

  const followState = followStateResult.error ? "none" : followStateResult.data?.status ?? "none";

  const followersCount = relationshipCountsResult.error ? 0 : relationshipCountsResult.data?.followers ?? 0;
  const followingCount = relationshipCountsResult.error ? 0 : relationshipCountsResult.data?.following ?? 0;

  const postCount = postCountResult.error ? 0 : postCountResult.data?.count ?? 0;
  const postCountKnown = !postCountResult.error;

  const postsError = postsResult.error ?? null;
  const postPage = postsResult.data;
  const posts = postsError ? [] : postPage?.items ?? [];
  const postsNextCursor = postsError ? null : postPage?.nextCursor ?? null;
  const hasMorePosts = postsError
    ? false
    : postCountKnown
      ? posts.length < postCount && postsNextCursor !== null
      : postPage?.hasMore ?? false;

  const dashboard = dashboardResult.error ? null : dashboardResult.data ?? null;
  const progressError = dashboardResult.error ?? null;

  return {
    kind: "loaded",
    currentUserId: viewerId,
    profile,
    profilePhotoUrl,
    followState,
    followersCount,
    followingCount,
    postCount,
    postCountKnown,
    posts,
    postsNextCursor,
    hasMorePosts,
    postsError,
    dashboard,
    progressError,
  };
}
