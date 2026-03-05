import { fetchVisiblePostsForCurrentUser, type VisibleFeedPostRow } from "../../../data/posts";
import type { PostRow } from "../../../data/types";
import { getProfilePhotoSignedUrl } from "../../profile";
import { DEFAULT_AUDIENCE_HINT } from "../models/audience";
import type { AuthorContext } from "../models/authorContext";
import { resolveCurrentAuthorContext } from "../services/authorContext";

type LoadFeedPageOptions = {
  limit: number;
  cursor: number;
};

export type LoadFeedPageWorkflowResult = {
  posts: VisibleFeedPostRow[];
  error: string | null;
  nextCursor: number | null;
  hasMore: boolean;
};

export async function loadFeedPageWorkflow({
  limit,
  cursor,
}: LoadFeedPageOptions): Promise<LoadFeedPageWorkflowResult> {
  const result = await fetchVisiblePostsForCurrentUser({ limit, cursor });
  if (result.error) {
    return { posts: [], error: result.error, nextCursor: null, hasMore: false };
  }

  const page = result.data;
  const posts = page?.items ?? [];
  return {
    posts,
    error: null,
    nextCursor: page?.nextCursor ?? null,
    hasMore: page?.hasMore ?? false,
  };
}

export function mergeFeedPosts(
  existingPosts: VisibleFeedPostRow[],
  nextPage: VisibleFeedPostRow[],
) {
  const merged = [...existingPosts];
  for (const post of nextPage) {
    if (!merged.some((existing) => existing.id === post.id)) {
      merged.push(post);
    }
  }
  return merged;
}

async function resolveFeedAuthorPhotoUrls(
  postEntries: VisibleFeedPostRow[],
  existingUrls?: Record<string, string | null>,
): Promise<Record<string, string | null>> {
  const next = { ...(existingUrls ?? {}) };
  const authorsToResolve = postEntries.filter(
    (post) =>
      post.authorAvatarPath &&
      post.authorAvatarPath.trim().length > 0 &&
      !(post.authorUserId in next),
  );

  if (authorsToResolve.length === 0) {
    return next;
  }

  const uniqueAuthors = new Map<string, string>();
  for (const post of authorsToResolve) {
    if (post.authorAvatarPath) {
      uniqueAuthors.set(post.authorUserId, post.authorAvatarPath);
    }
  }

  await Promise.all(
    Array.from(uniqueAuthors.entries()).map(async ([authorUserId, avatarPath]) => {
      const signedUrlResult = await getProfilePhotoSignedUrl(avatarPath);
      next[authorUserId] = signedUrlResult.data?.signedUrl ?? null;
    }),
  );

  return next;
}

function withCurrentAuthorPhoto(
  photoUrls: Record<string, string | null>,
  authorContext: AuthorContext | null,
) {
  if (!authorContext?.photoUrl) {
    return photoUrls;
  }

  return {
    ...photoUrls,
    [authorContext.userId]: authorContext.photoUrl,
  };
}

export type FeedWorkflowPayload = {
  posts: VisibleFeedPostRow[];
  authorPhotoUrls: Record<string, string | null>;
  hasMore: boolean;
  nextCursor: number | null;
  authorContext: AuthorContext | null;
  defaultAudienceHint: string;
  error: string | null;
};

type LoadFeedWorkflowOptions = {
  limit: number;
};

export async function loadFeedWorkflow({
  limit,
}: LoadFeedWorkflowOptions): Promise<FeedWorkflowPayload> {
  const [feedPage, authorContext] = await Promise.all([
    loadFeedPageWorkflow({ limit, cursor: 0 }),
    resolveCurrentAuthorContext(),
  ]);

  const defaultAudienceHint = authorContext?.defaultAudienceHint ?? DEFAULT_AUDIENCE_HINT;
  if (feedPage.error) {
    return {
      posts: [],
      authorPhotoUrls: {},
      hasMore: false,
      nextCursor: null,
      authorContext,
      defaultAudienceHint,
      error: feedPage.error,
    };
  }

  const photoUrls = await resolveFeedAuthorPhotoUrls(feedPage.posts);
  return {
    posts: feedPage.posts,
    authorPhotoUrls: withCurrentAuthorPhoto(photoUrls, authorContext),
    hasMore: feedPage.hasMore,
    nextCursor: feedPage.nextCursor,
    authorContext,
    defaultAudienceHint,
    error: null,
  };
}

type RefreshFeedWorkflowOptions = {
  limit: number;
  existingPosts: VisibleFeedPostRow[];
  existingAuthorPhotoUrls: Record<string, string | null>;
  existingHasMore: boolean;
  existingNextCursor: number | null;
};

export async function refreshFeedWorkflow({
  limit,
  existingPosts,
  existingAuthorPhotoUrls,
  existingHasMore,
  existingNextCursor,
}: RefreshFeedWorkflowOptions): Promise<FeedWorkflowPayload> {
  const [feedPage, authorContext] = await Promise.all([
    loadFeedPageWorkflow({ limit, cursor: 0 }),
    resolveCurrentAuthorContext(),
  ]);

  const defaultAudienceHint = authorContext?.defaultAudienceHint ?? DEFAULT_AUDIENCE_HINT;
  if (feedPage.error) {
    return {
      posts: existingPosts,
      authorPhotoUrls: withCurrentAuthorPhoto(existingAuthorPhotoUrls, authorContext),
      hasMore: existingHasMore,
      nextCursor: existingNextCursor,
      authorContext,
      defaultAudienceHint,
      error: feedPage.error,
    };
  }

  const photoUrls = await resolveFeedAuthorPhotoUrls(feedPage.posts, existingAuthorPhotoUrls);
  return {
    posts: feedPage.posts,
    authorPhotoUrls: withCurrentAuthorPhoto(photoUrls, authorContext),
    hasMore: feedPage.hasMore,
    nextCursor: feedPage.nextCursor,
    authorContext,
    defaultAudienceHint,
    error: null,
  };
}

type LoadNextFeedPageWorkflowOptions = {
  limit: number;
  cursor: number;
  existingPosts: VisibleFeedPostRow[];
  existingAuthorPhotoUrls: Record<string, string | null>;
  currentAuthorContext: AuthorContext | null;
};

export async function loadNextFeedPageWorkflow({
  limit,
  cursor,
  existingPosts,
  existingAuthorPhotoUrls,
  currentAuthorContext,
}: LoadNextFeedPageWorkflowOptions): Promise<FeedWorkflowPayload> {
  const page = await loadFeedPageWorkflow({ limit, cursor });
  if (page.error) {
    return {
      posts: existingPosts,
      authorPhotoUrls: existingAuthorPhotoUrls,
      hasMore: false,
      nextCursor: null,
      authorContext: currentAuthorContext,
      defaultAudienceHint: currentAuthorContext?.defaultAudienceHint ?? DEFAULT_AUDIENCE_HINT,
      error: page.error,
    };
  }

  const mergedPosts = mergeFeedPosts(existingPosts, page.posts);
  const photoUrls = await resolveFeedAuthorPhotoUrls(mergedPosts, existingAuthorPhotoUrls);
  return {
    posts: mergedPosts,
    authorPhotoUrls: withCurrentAuthorPhoto(photoUrls, currentAuthorContext),
    hasMore: page.hasMore,
    nextCursor: page.nextCursor,
    authorContext: currentAuthorContext,
    defaultAudienceHint: currentAuthorContext?.defaultAudienceHint ?? DEFAULT_AUDIENCE_HINT,
    error: null,
  };
}

type ReconcileCreatedPostWorkflowOptions = {
  createdPost: PostRow;
  currentAuthorContext: AuthorContext | null;
  existingPosts: VisibleFeedPostRow[];
  existingAuthorPhotoUrls: Record<string, string | null>;
};

export type ReconcileCreatedPostWorkflowResult = {
  posts: VisibleFeedPostRow[];
  authorPhotoUrls: Record<string, string | null>;
};

export async function reconcileCreatedPostWorkflow({
  createdPost,
  currentAuthorContext,
  existingPosts,
  existingAuthorPhotoUrls,
}: ReconcileCreatedPostWorkflowOptions): Promise<ReconcileCreatedPostWorkflowResult> {
  const fallbackName = `User ${createdPost.authorUserId.slice(0, 8)}`;
  const authorDisplayName = currentAuthorContext?.displayName ?? fallbackName;
  const authorAvatarPath = currentAuthorContext?.avatarPath ?? null;

  const nextPost: VisibleFeedPostRow = {
    ...createdPost,
    authorDisplayName,
    authorAvatarPath,
  };

  const posts = [nextPost, ...existingPosts.filter((existing) => existing.id !== nextPost.id)];
  if (currentAuthorContext?.photoUrl) {
    return {
      posts,
      authorPhotoUrls: {
        ...existingAuthorPhotoUrls,
        [createdPost.authorUserId]: currentAuthorContext.photoUrl,
      },
    };
  }

  if (!authorAvatarPath) {
    return {
      posts,
      authorPhotoUrls: existingAuthorPhotoUrls,
    };
  }

  const signedUrlResult = await getProfilePhotoSignedUrl(authorAvatarPath);
  if (!signedUrlResult.data?.signedUrl) {
    return {
      posts,
      authorPhotoUrls: existingAuthorPhotoUrls,
    };
  }

  return {
    posts,
    authorPhotoUrls: {
      ...existingAuthorPhotoUrls,
      [createdPost.authorUserId]: signedUrlResult.data.signedUrl,
    },
  };
}
