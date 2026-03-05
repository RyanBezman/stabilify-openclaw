import { fetchDashboardData } from "../../../data/dashboard";
import { fetchActionableNotificationCount } from "../../../data/notifications";
import { fetchCurrentUserPostCount, fetchCurrentUserPosts } from "../../../data/posts";
import {
  fetchRelationshipCounts,
} from "../../../data/relationships";
import type { PostRow } from "../../../data/types";
import { getProfilePhotoSignedUrl } from "../services/photo";

type DashboardState = Awaited<ReturnType<typeof fetchDashboardData>>["data"] | null;

type RefreshOwnProfileOptions = {
  userId?: string | null;
  preserveOnError?: boolean;
};

export type RefreshOwnProfileResult = {
  dashboard: DashboardState;
  photoUrl: string | null;
  error?: string;
  preserveExistingOnError: boolean;
};

export async function refreshOwnProfile({
  userId,
  preserveOnError = false,
}: RefreshOwnProfileOptions): Promise<RefreshOwnProfileResult> {
  const { data, error } = await fetchDashboardData(userId ?? undefined);
  if (error) {
    return {
      dashboard: null,
      photoUrl: null,
      error,
      preserveExistingOnError: preserveOnError,
    };
  }

  const dashboard = data ?? null;
  const avatarPath = dashboard?.profile?.avatarPath ?? null;
  if (!avatarPath) {
    return {
      dashboard,
      photoUrl: null,
      preserveExistingOnError: false,
    };
  }

  const signedUrlRes = await getProfilePhotoSignedUrl(avatarPath);
  if (signedUrlRes.error || !signedUrlRes.data?.signedUrl) {
    return {
      dashboard,
      photoUrl: null,
      error: signedUrlRes.error ?? "Couldn't load profile photo URL.",
      preserveExistingOnError: preserveOnError,
    };
  }

  return {
    dashboard,
    photoUrl: signedUrlRes.data.signedUrl,
    preserveExistingOnError: false,
  };
}

type LoadOwnProfileSummaryWorkflowOptions = {
  userId?: string | null;
  postsPageSize?: number;
};

type LoadOwnProfileWorkflowResult = {
  profileResult: RefreshOwnProfileResult;
  relationshipCountsResult: Awaited<ReturnType<typeof fetchRelationshipCounts>>;
  notificationCountResult: Awaited<ReturnType<typeof fetchActionableNotificationCount>>;
  postCountResult: Awaited<ReturnType<typeof fetchCurrentUserPostCount>>;
  postsResult: Awaited<ReturnType<typeof fetchCurrentUserPosts>>;
  followersCount: number;
  followingCount: number;
  pendingFollowRequestsCount: number;
  postCount: number;
  postCountKnown: boolean;
  initialPosts: PostRow[];
  postsNextCursor: number | null;
  hasMorePosts: boolean;
};

const DEFAULT_OWN_PROFILE_POSTS_PAGE_SIZE = 5;
const ownProfileBootstrapInflight = new Map<string, Promise<LoadOwnProfileWorkflowResult>>();

function ownProfileBootstrapKey(userId: string | null | undefined, postsPageSize: number) {
  return `${userId ?? "self"}:${postsPageSize}`;
}

export async function loadOwnProfileWorkflow({
  userId,
  postsPageSize = DEFAULT_OWN_PROFILE_POSTS_PAGE_SIZE,
}: LoadOwnProfileSummaryWorkflowOptions): Promise<LoadOwnProfileWorkflowResult> {
  const key = ownProfileBootstrapKey(userId, postsPageSize);
  const existing = ownProfileBootstrapInflight.get(key);
  if (existing) {
    return existing;
  }

  const task = (async () => {
    const [
      profileResult,
      relationshipCountsResult,
      notificationCountResult,
      postCountResult,
      postsResult,
    ] =
      await Promise.all([
      refreshOwnProfile({ userId }),
      fetchRelationshipCounts(userId ?? undefined),
      fetchActionableNotificationCount(userId ?? undefined),
      fetchCurrentUserPostCount(userId ?? undefined),
      fetchCurrentUserPosts({
        userId: userId ?? undefined,
        limit: postsPageSize,
        cursor: 0,
      }),
    ]);

    const followersCount = relationshipCountsResult.error
      ? 0
      : relationshipCountsResult.data?.followers ?? 0;
    const followingCount = relationshipCountsResult.error
      ? 0
      : relationshipCountsResult.data?.following ?? 0;
    const pendingFollowRequestsCount =
      notificationCountResult.error
        ? 0
        : notificationCountResult.data?.count ?? 0;
    const postCountKnown = !postCountResult.error;
    const postCount = postCountKnown ? postCountResult.data?.count ?? 0 : 0;

    const postsPage = postsResult.data;
    const initialPosts = postsResult.error ? [] : postsPage?.items ?? [];
    const postsNextCursor = postsResult.error ? null : postsPage?.nextCursor ?? null;
    const hasMorePosts = postsResult.error
      ? false
      : postCountKnown
        ? initialPosts.length < postCount && postsNextCursor !== null
        : postsPage?.hasMore ?? false;

    return {
      profileResult,
      relationshipCountsResult,
      notificationCountResult,
      postCountResult,
      postsResult,
      followersCount,
      followingCount,
      pendingFollowRequestsCount,
      postCount,
      postCountKnown,
      initialPosts,
      postsNextCursor,
      hasMorePosts,
    };
  })();

  ownProfileBootstrapInflight.set(key, task);
  try {
    return await task;
  } finally {
    if (ownProfileBootstrapInflight.get(key) === task) {
      ownProfileBootstrapInflight.delete(key);
    }
  }
}

type RefreshOwnProfileProgressWorkflowOptions = {
  userId?: string | null;
  refreshProfile: (options?: { preserveOnError?: boolean }) => Promise<{ error?: string }>;
  refreshPostCount?: () => Promise<{ error?: string }>;
};

export type RefreshOwnProfileProgressWorkflowResult = {
  followersCount: number | null;
  followingCount: number | null;
  error?: string;
};

export async function refreshOwnProfileProgressWorkflow({
  userId,
  refreshProfile,
  refreshPostCount,
}: RefreshOwnProfileProgressWorkflowOptions): Promise<RefreshOwnProfileProgressWorkflowResult> {
  const postCountRefreshTask: Promise<{ error?: string }> = refreshPostCount
    ? refreshPostCount()
    : Promise.resolve({});

  const [dashboardRefreshResult, relationshipCountsResult, postCountRefreshResult] =
    await Promise.all([
      refreshProfile({ preserveOnError: true }),
      fetchRelationshipCounts(userId ?? undefined),
      postCountRefreshTask,
    ]);

  let errorMessage: string | null = null;

  if (dashboardRefreshResult.error) {
    errorMessage = dashboardRefreshResult.error;
  }

  let followersCount: number | null = null;
  let followingCount: number | null = null;

  if (relationshipCountsResult.error) {
    if (!errorMessage) {
      errorMessage = relationshipCountsResult.error;
    }
  } else {
    followersCount = relationshipCountsResult.data?.followers ?? 0;
    followingCount = relationshipCountsResult.data?.following ?? 0;
  }

  if (postCountRefreshResult.error && !errorMessage) {
    errorMessage = postCountRefreshResult.error;
  }

  if (errorMessage) {
    return {
      followersCount,
      followingCount,
      error: `Couldn't refresh all progress stats. ${errorMessage}`,
    };
  }

  return {
    followersCount,
    followingCount,
  };
}
