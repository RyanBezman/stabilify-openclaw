import { useCallback, useEffect, useReducer, useState } from "react";
import type { VisibleFeedPostRow } from "../../../data/posts";
import type { PostRow } from "../../../data/types";
import {
  feedAsyncReducer,
  initialFeedAsyncState,
} from "../models/feedAsyncState";
import { isNearFeedBottom } from "../models/pagination";
import {
  isAsyncWorkflowBusy,
} from "../../shared";
import { DEFAULT_AUDIENCE_HINT } from "../models/audience";
import type { AuthorContext } from "../models/authorContext";
import {
  loadFeedWorkflow,
  loadNextFeedPageWorkflow,
  reconcileCreatedPostWorkflow,
  refreshFeedWorkflow,
} from "../workflows";

const FEED_PAGE_SIZE = 10;

export function useFeed() {
  const [posts, setPosts] = useState<VisibleFeedPostRow[]>([]);
  const [asyncState, dispatchAsync] = useReducer(feedAsyncReducer, initialFeedAsyncState);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(0);
  const [authorPhotoUrls, setAuthorPhotoUrls] = useState<Record<string, string | null>>({});
  const [defaultAudienceHint, setDefaultAudienceHint] = useState(DEFAULT_AUDIENCE_HINT);
  const [currentAuthorContext, setCurrentAuthorContext] = useState<AuthorContext | null>(
    null,
  );
  const loading = isAsyncWorkflowBusy(asyncState.initial);
  const loadingMore = isAsyncWorkflowBusy(asyncState.pagination);
  const refreshing = isAsyncWorkflowBusy(asyncState.refresh);
  const error = asyncState.error;

  const applyAuthorContext = useCallback((authorContext: AuthorContext | null) => {
    setCurrentAuthorContext(authorContext);
    setDefaultAudienceHint(authorContext?.defaultAudienceHint ?? DEFAULT_AUDIENCE_HINT);
  }, []);

  const refreshFeed = useCallback(async () => {
    dispatchAsync({ type: "refresh/start" });
    const result = await refreshFeedWorkflow({
      limit: FEED_PAGE_SIZE,
      existingPosts: posts,
      existingAuthorPhotoUrls: authorPhotoUrls,
      existingHasMore: hasMore,
      existingNextCursor: nextCursor,
    });
    applyAuthorContext(result.authorContext);
    setPosts(result.posts);
    setAuthorPhotoUrls(result.authorPhotoUrls);
    setHasMore(result.hasMore);
    setNextCursor(result.nextCursor);

    if (result.error) {
      dispatchAsync({ type: "refresh/fail", error: result.error });
      return;
    }
    dispatchAsync({ type: "refresh/succeed" });
  }, [applyAuthorContext, authorPhotoUrls, hasMore, nextCursor, posts]);

  useEffect(() => {
    let active = true;
    dispatchAsync({ type: "initial/start" });

    const load = async () => {
      const result = await loadFeedWorkflow({
        limit: FEED_PAGE_SIZE,
      });
      if (!active) return;
      applyAuthorContext(result.authorContext);
      setPosts(result.posts);
      setAuthorPhotoUrls(result.authorPhotoUrls);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);

      if (result.error) {
        dispatchAsync({ type: "initial/fail", error: result.error });
        return;
      }
      dispatchAsync({ type: "initial/succeed" });
    };

    void load();

    return () => {
      active = false;
    };
  }, [applyAuthorContext]);

  const loadFeedPage = useCallback(async () => {
    if (loadingMore || loading || !hasMore) {
      return;
    }

    dispatchAsync({ type: "pagination/start" });
    const result = await loadNextFeedPageWorkflow({
      limit: FEED_PAGE_SIZE,
      cursor: nextCursor ?? 0,
      existingPosts: posts,
      existingAuthorPhotoUrls: authorPhotoUrls,
      currentAuthorContext,
    });

    if (result.error) {
      dispatchAsync({ type: "pagination/fail", error: result.error });
      return;
    }

    setPosts(result.posts);
    setAuthorPhotoUrls(result.authorPhotoUrls);
    dispatchAsync({ type: "pagination/succeed" });
    setHasMore(result.hasMore);
    setNextCursor(result.nextCursor);
  }, [authorPhotoUrls, currentAuthorContext, hasMore, loading, loadingMore, nextCursor, posts]);

  const handleFeedScroll = useCallback(
    (event: {
      nativeEvent: {
        layoutMeasurement: { height: number };
        contentOffset: { y: number };
        contentSize: { height: number };
      };
    }) => {
      if (loading || loadingMore || !hasMore) {
        return;
      }

      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      if (
        isNearFeedBottom({
          layoutHeight: layoutMeasurement.height,
          offsetY: contentOffset.y,
          contentHeight: contentSize.height,
        })
      ) {
        void loadFeedPage();
      }
    },
    [hasMore, loadFeedPage, loading, loadingMore],
  );

  const handlePostCreated = useCallback(
    async (createdPost: PostRow) => {
      const result = await reconcileCreatedPostWorkflow({
        createdPost,
        currentAuthorContext,
        existingPosts: posts,
        existingAuthorPhotoUrls: authorPhotoUrls,
      });
      setPosts(result.posts);
      setAuthorPhotoUrls(result.authorPhotoUrls);
      dispatchAsync({ type: "clearError" });
    },
    [authorPhotoUrls, currentAuthorContext, posts],
  );

  // Backward-compatible aliases while callers migrate to explicit action names.
  const handleLoadMore = loadFeedPage;
  const handleRefresh = refreshFeed;

  return {
    posts,
    loading,
    error,
    loadingMore,
    hasMore,
    authorPhotoUrls,
    refreshing,
    initialLoadStatus: asyncState.initial.status,
    refreshStatus: asyncState.refresh.status,
    paginationStatus: asyncState.pagination.status,
    defaultAudienceHint,
    currentAuthorContext,
    loadFeedPage,
    refreshFeed,
    handleLoadMore,
    handleFeedScroll,
    handlePostCreated,
    handleRefresh,
  };
}
