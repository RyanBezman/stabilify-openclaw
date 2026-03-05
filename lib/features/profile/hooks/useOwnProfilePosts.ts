import { useCallback, useEffect, useReducer, useState } from "react";
import type { PostRow } from "../../../data/types";
import {
  deleteCurrentUserPost,
  fetchCurrentUserPostCount,
  fetchCurrentUserPosts,
} from "../../../data/posts";
import {
  asyncWorkflowReducer,
  createAsyncWorkflowState,
  isAsyncWorkflowBusy,
} from "../../shared";
import { loadOwnProfileWorkflow } from "../workflows/ownProfileWorkflow";

type UseOwnProfilePostsParams = {
  userId?: string | null;
  postsPageSize?: number;
};

const DEFAULT_POSTS_PAGE_SIZE = 5;

type OwnProfilePostsAsyncState = {
  initial: ReturnType<typeof createAsyncWorkflowState>;
  refresh: ReturnType<typeof createAsyncWorkflowState>;
  pagination: ReturnType<typeof createAsyncWorkflowState>;
  error: string | null;
};

type OwnProfilePostsAsyncAction =
  | { type: "initial/start" }
  | { type: "initial/succeed" }
  | { type: "initial/fail"; error: string }
  | { type: "refresh/start" }
  | { type: "refresh/succeed" }
  | { type: "refresh/fail"; error: string }
  | { type: "pagination/start" }
  | { type: "pagination/succeed" }
  | { type: "pagination/fail"; error: string };

const initialOwnProfilePostsAsyncState: OwnProfilePostsAsyncState = {
  initial: createAsyncWorkflowState("loading"),
  refresh: createAsyncWorkflowState(),
  pagination: createAsyncWorkflowState(),
  error: null,
};

function ownProfilePostsAsyncReducer(
  state: OwnProfilePostsAsyncState,
  action: OwnProfilePostsAsyncAction,
): OwnProfilePostsAsyncState {
  switch (action.type) {
    case "initial/start":
      return {
        ...state,
        initial: asyncWorkflowReducer(state.initial, { type: "start" }),
      };
    case "initial/succeed":
      return {
        ...state,
        initial: asyncWorkflowReducer(state.initial, { type: "succeed" }),
        error: null,
      };
    case "initial/fail":
      return {
        ...state,
        initial: asyncWorkflowReducer(state.initial, { type: "fail", error: action.error }),
        error: action.error,
      };
    case "refresh/start":
      return {
        ...state,
        refresh: asyncWorkflowReducer(state.refresh, { type: "start" }),
      };
    case "refresh/succeed":
      return {
        ...state,
        refresh: asyncWorkflowReducer(state.refresh, { type: "succeed" }),
        error: null,
      };
    case "refresh/fail":
      return {
        ...state,
        refresh: asyncWorkflowReducer(state.refresh, { type: "fail", error: action.error }),
        error: action.error,
      };
    case "pagination/start":
      return {
        ...state,
        pagination: asyncWorkflowReducer(state.pagination, { type: "start" }),
      };
    case "pagination/succeed":
      return {
        ...state,
        pagination: asyncWorkflowReducer(state.pagination, { type: "succeed" }),
        error: null,
      };
    case "pagination/fail":
      return {
        ...state,
        pagination: asyncWorkflowReducer(state.pagination, {
          type: "fail",
          error: action.error,
        }),
        error: action.error,
      };
    default:
      return state;
  }
}

export function useOwnProfilePosts({
  userId,
  postsPageSize = DEFAULT_POSTS_PAGE_SIZE,
}: UseOwnProfilePostsParams) {
  const userIdOrUndefined = userId ?? undefined;
  const [postCount, setPostCount] = useState(0);
  const [postCountKnown, setPostCountKnown] = useState(true);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [postsNextCursor, setPostsNextCursor] = useState<number | null>(0);
  const [asyncState, dispatchAsync] = useReducer(
    ownProfilePostsAsyncReducer,
    initialOwnProfilePostsAsyncState,
  );
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const postsLoading = isAsyncWorkflowBusy(asyncState.initial);
  const refreshingPosts = isAsyncWorkflowBusy(asyncState.refresh);
  const loadingMorePosts = isAsyncWorkflowBusy(asyncState.pagination);
  const postsError = asyncState.error;

  useEffect(() => {
    let active = true;
    dispatchAsync({ type: "initial/start" });

    const load = async () => {
      const workflowResult = await loadOwnProfileWorkflow({
        userId: userIdOrUndefined,
        postsPageSize,
      });

      if (!active) return;

      setPostCount(workflowResult.postCount);
      setPostCountKnown(workflowResult.postCountKnown);

      if (workflowResult.postsResult.error) {
        setPosts([]);
        setPostsNextCursor(null);
        dispatchAsync({ type: "initial/fail", error: workflowResult.postsResult.error });
        setHasMorePosts(false);
      } else {
        setPosts(workflowResult.initialPosts);
        setPostsNextCursor(workflowResult.postsNextCursor);
        dispatchAsync({ type: "initial/succeed" });
        setHasMorePosts(workflowResult.hasMorePosts);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [postsPageSize, userIdOrUndefined]);

  const refreshPosts = useCallback(async () => {
    if (postsLoading || loadingMorePosts || refreshingPosts) {
      return;
    }

    dispatchAsync({ type: "refresh/start" });

    const workflowResult = await loadOwnProfileWorkflow({
      userId: userIdOrUndefined,
      postsPageSize,
    });

    setPostCount(workflowResult.postCount);
    setPostCountKnown(workflowResult.postCountKnown);

    if (workflowResult.postsResult.error) {
      dispatchAsync({ type: "refresh/fail", error: workflowResult.postsResult.error });
      return;
    }

    setPosts(workflowResult.initialPosts);
    setPostsNextCursor(workflowResult.postsNextCursor);
    setHasMorePosts(workflowResult.hasMorePosts);
    dispatchAsync({ type: "refresh/succeed" });
  }, [loadingMorePosts, postsLoading, postsPageSize, refreshingPosts, userIdOrUndefined]);

  const handleDeletePost = useCallback(
    async (postId: string): Promise<{ error?: string }> => {
      if (deletingPostId) return {};

      setDeletingPostId(postId);
      const result = await deleteCurrentUserPost(postId, userIdOrUndefined);
      setDeletingPostId(null);

      if (result.error) {
        return { error: result.error };
      }

      const nextPosts = posts.filter((post) => post.id !== postId);
      const nextCount = Math.max(0, postCount - 1);
      setPosts(nextPosts);
      setPostCount(nextCount);
      if (postCountKnown) {
        setHasMorePosts(nextPosts.length < nextCount);
      }

      return {};
    },
    [deletingPostId, postCount, postCountKnown, posts, userIdOrUndefined],
  );

  const handleLoadMorePosts = useCallback(async () => {
    if (loadingMorePosts || postsLoading || !hasMorePosts) {
      return;
    }

    dispatchAsync({ type: "pagination/start" });
    const result = await fetchCurrentUserPosts({
      userId: userIdOrUndefined,
      limit: postsPageSize,
      cursor: postsNextCursor ?? 0,
    });

    if (result.error) {
      dispatchAsync({ type: "pagination/fail", error: result.error });
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
    dispatchAsync({ type: "pagination/succeed" });

    if (postCountKnown) {
      setHasMorePosts(merged.length < postCount && (postPage?.nextCursor ?? null) !== null);
    } else {
      setHasMorePosts(postPage?.hasMore ?? false);
    }
  }, [
    hasMorePosts,
    loadingMorePosts,
    postCount,
    postCountKnown,
    posts,
    postsNextCursor,
    postsLoading,
    postsPageSize,
    userIdOrUndefined,
  ]);

  const refreshPostCount = useCallback(async (): Promise<{ error?: string }> => {
    const result = await fetchCurrentUserPostCount(userIdOrUndefined);
    if (result.error) {
      return { error: result.error };
    }

    const nextCount = result.data?.count ?? 0;
    setPostCount(nextCount);
    setPostCountKnown(true);
    setHasMorePosts(posts.length < nextCount);
    return {};
  }, [posts.length, userIdOrUndefined]);

  return {
    postCount,
    posts,
    postsLoading,
    postsLoadStatus: asyncState.initial.status,
    postsError,
    refreshingPosts,
    postsRefreshStatus: asyncState.refresh.status,
    hasMorePosts,
    loadingMorePosts,
    postsPaginationStatus: asyncState.pagination.status,
    deletingPostId,
    handleDeletePost,
    handleLoadMorePosts,
    refreshPosts,
    refreshPostCount,
  };
}
