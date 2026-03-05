import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Animated } from "react-native";
import type { PostRow } from "../../../data/types";
import { fetchVisiblePostsByAuthorForCurrentUser } from "../../../data/posts";
import type { ViewerFollowState } from "../../../data/relationships";
import type { UserDirectoryRow } from "../../../data/userDirectory";
import { buildProfileProgressModel } from "../models/progressModel";
import { canShowProgressTab } from "../models/visibility";
import {
  loadUserProfileWorkflow,
  type UserProfileDashboardState,
} from "../workflows/userProfileWorkflow";
import {
  asyncWorkflowReducer,
  createAsyncWorkflowState,
  isAsyncWorkflowBusy,
} from "../../shared";

type DashboardState = UserProfileDashboardState;

type UseUserProfileQueryParams = {
  targetUserId: string;
  postsPageSize?: number;
};

const DEFAULT_POSTS_PAGE_SIZE = 5;

type UserProfileAsyncState = {
  profileLoad: ReturnType<typeof createAsyncWorkflowState>;
  postsPagination: ReturnType<typeof createAsyncWorkflowState>;
  progress: ReturnType<typeof createAsyncWorkflowState>;
  postsError: string | null;
};

type UserProfileAsyncAction =
  | { type: "profile/start" }
  | { type: "profile/succeed" }
  | { type: "profile/fail"; error: string }
  | { type: "profile/reset" }
  | { type: "postsPagination/start" }
  | { type: "postsPagination/succeed" }
  | { type: "postsPagination/fail"; error: string }
  | { type: "posts/clearError" }
  | { type: "posts/setError"; error: string }
  | { type: "progress/start" }
  | { type: "progress/succeed" }
  | { type: "progress/fail"; error: string }
  | { type: "progress/reset" };

const initialUserProfileAsyncState: UserProfileAsyncState = {
  profileLoad: createAsyncWorkflowState("loading"),
  postsPagination: createAsyncWorkflowState(),
  progress: createAsyncWorkflowState(),
  postsError: null,
};

function userProfileAsyncReducer(
  state: UserProfileAsyncState,
  action: UserProfileAsyncAction,
): UserProfileAsyncState {
  switch (action.type) {
    case "profile/start":
      return {
        ...state,
        profileLoad: asyncWorkflowReducer(state.profileLoad, { type: "start" }),
      };
    case "profile/succeed":
      return {
        ...state,
        profileLoad: asyncWorkflowReducer(state.profileLoad, { type: "succeed" }),
      };
    case "profile/fail":
      return {
        ...state,
        profileLoad: asyncWorkflowReducer(state.profileLoad, { type: "fail", error: action.error }),
      };
    case "profile/reset":
      return {
        ...state,
        profileLoad: asyncWorkflowReducer(state.profileLoad, { type: "reset" }),
      };
    case "postsPagination/start":
      return {
        ...state,
        postsPagination: asyncWorkflowReducer(state.postsPagination, { type: "start" }),
      };
    case "postsPagination/succeed":
      return {
        ...state,
        postsPagination: asyncWorkflowReducer(state.postsPagination, { type: "succeed" }),
        postsError: null,
      };
    case "postsPagination/fail":
      return {
        ...state,
        postsPagination: asyncWorkflowReducer(state.postsPagination, {
          type: "fail",
          error: action.error,
        }),
        postsError: action.error,
      };
    case "posts/clearError":
      return {
        ...state,
        postsError: null,
      };
    case "posts/setError":
      return {
        ...state,
        postsError: action.error,
      };
    case "progress/start":
      return {
        ...state,
        progress: asyncWorkflowReducer(state.progress, { type: "start" }),
      };
    case "progress/succeed":
      return {
        ...state,
        progress: asyncWorkflowReducer(state.progress, { type: "succeed" }),
      };
    case "progress/fail":
      return {
        ...state,
        progress: asyncWorkflowReducer(state.progress, { type: "fail", error: action.error }),
      };
    case "progress/reset":
      return {
        ...state,
        progress: asyncWorkflowReducer(state.progress, { type: "reset" }),
      };
    default:
      return state;
  }
}

export function useUserProfileQuery({
  targetUserId,
  postsPageSize = DEFAULT_POSTS_PAGE_SIZE,
}: UseUserProfileQueryParams) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserDirectoryRow | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [asyncState, dispatchAsync] = useReducer(
    userProfileAsyncReducer,
    initialUserProfileAsyncState,
  );

  const [dashboard, setDashboard] = useState<DashboardState>(null);

  const [posts, setPosts] = useState<PostRow[]>([]);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [postsNextCursor, setPostsNextCursor] = useState<number | null>(0);
  const [postCount, setPostCount] = useState(0);
  const [postCountKnown, setPostCountKnown] = useState(true);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followState, setFollowState] = useState<ViewerFollowState>("none");
  const [shouldRedirectToOwnProfile, setShouldRedirectToOwnProfile] = useState(false);
  const loading = isAsyncWorkflowBusy(asyncState.profileLoad);
  const error = asyncState.profileLoad.error;
  const postsLoading = loading;
  const postsError = asyncState.postsError;
  const loadingMorePosts = isAsyncWorkflowBusy(asyncState.postsPagination);
  const progressError = asyncState.progress.error;

  const contentOpacity = useRef(new Animated.Value(0)).current;

  const loadProfile = useCallback(async () => {
    dispatchAsync({ type: "profile/start" });
    dispatchAsync({ type: "progress/start" });
    setShouldRedirectToOwnProfile(false);

    const workflowResult = await loadUserProfileWorkflow({ targetUserId, postsPageSize });

    if (workflowResult.kind === "profile_error") {
      dispatchAsync({ type: "profile/fail", error: workflowResult.error });
      dispatchAsync({ type: "progress/reset" });
      return;
    }

    setCurrentUserId(workflowResult.currentUserId);
    if (workflowResult.kind === "redirect_to_own_profile") {
      setShouldRedirectToOwnProfile(true);
      dispatchAsync({ type: "profile/succeed" });
      dispatchAsync({ type: "progress/reset" });
      return;
    }

    setProfile(workflowResult.profile);
    setProfilePhotoUrl(workflowResult.profilePhotoUrl);
    setFollowState(workflowResult.followState);
    setFollowersCount(workflowResult.followersCount);
    setFollowingCount(workflowResult.followingCount);
    setPostCount(workflowResult.postCount);
    setPostCountKnown(workflowResult.postCountKnown);

    if (workflowResult.postsError) {
      setPosts([]);
      setPostsNextCursor(null);
      dispatchAsync({ type: "posts/setError", error: workflowResult.postsError });
      setHasMorePosts(false);
    } else {
      setPosts(workflowResult.posts);
      setPostsNextCursor(workflowResult.postsNextCursor);
      dispatchAsync({ type: "posts/clearError" });
      setHasMorePosts(workflowResult.hasMorePosts);
    }

    if (workflowResult.progressError) {
      setDashboard(null);
      dispatchAsync({ type: "progress/fail", error: workflowResult.progressError });
    } else {
      setDashboard(workflowResult.dashboard);
      dispatchAsync({ type: "progress/succeed" });
    }

    dispatchAsync({ type: "profile/succeed" });
  }, [postsPageSize, targetUserId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!loading) {
      contentOpacity.setValue(0);
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [contentOpacity, loading]);

  const isOwner = currentUserId === targetUserId;
  const isFollowing = followState === "accepted";
  const isPrivateAndLocked = !isOwner && profile?.accountVisibility === "private" && !isFollowing;

  const showProgressTab = Boolean(
    profile &&
      !isPrivateAndLocked &&
      canShowProgressTab({
        isOwner,
        accountVisibility: profile.accountVisibility,
        progressVisibility: profile.progressVisibility,
      }),
  );

  const socialStats = useMemo(
    () => [
      { label: "Posts", value: String(postCount) },
      { label: "Followers", value: String(followersCount) },
      { label: "Following", value: String(followingCount) },
    ],
    [followersCount, followingCount, postCount],
  );

  const progressModel = useMemo(() => buildProfileProgressModel(dashboard ?? null), [dashboard]);

  const handleLoadMorePosts = useCallback(async () => {
    if (loadingMorePosts || postsLoading || !hasMorePosts || isPrivateAndLocked) {
      return;
    }

    dispatchAsync({ type: "postsPagination/start" });
    const result = await fetchVisiblePostsByAuthorForCurrentUser({
      authorUserId: targetUserId,
      limit: postsPageSize,
      cursor: postsNextCursor ?? 0,
    });

    if (result.error) {
      dispatchAsync({ type: "postsPagination/fail", error: result.error });
      return;
    }

    const postPage = result.data;
    const nextPage = postPage?.items ?? [];
    const merged = [...posts];
    for (const post of nextPage) {
      if (!merged.some((existing) => existing.id === post.id)) {
        merged.push(post);
      }
    }

    setPosts(merged);
    setPostsNextCursor(postPage?.nextCursor ?? null);
    dispatchAsync({ type: "postsPagination/succeed" });

    if (postCountKnown) {
      setHasMorePosts(merged.length < postCount && (postPage?.nextCursor ?? null) !== null);
    } else {
      setHasMorePosts(postPage?.hasMore ?? false);
    }
  }, [
    hasMorePosts,
    isPrivateAndLocked,
    loadingMorePosts,
    postCount,
    postCountKnown,
    posts,
    postsNextCursor,
    postsLoading,
    postsPageSize,
    targetUserId,
  ]);

  return {
    currentUserId,
    profile,
    profilePhotoUrl,
    loading,
    profileLoadStatus: asyncState.profileLoad.status,
    error,
    dashboard,
    progressError,
    progressStatus: asyncState.progress.status,
    posts,
    postsLoading,
    postsError,
    hasMorePosts,
    loadingMorePosts,
    postsPaginationStatus: asyncState.postsPagination.status,
    postCount,
    followersCount,
    setFollowersCount,
    followingCount,
    followState,
    setFollowState,
    shouldRedirectToOwnProfile,
    contentOpacity,
    isOwner,
    isFollowing,
    isPrivateAndLocked,
    showProgressTab,
    socialStats,
    progressModel,
    loadProfile,
    handleLoadMorePosts,
  };
}
