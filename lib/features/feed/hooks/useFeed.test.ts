import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AUDIENCE_HINT } from "../models/audience";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  fetchVisiblePostsForCurrentUser: vi.fn(),
  getProfilePhotoSignedUrl: vi.fn(),
  resolveCurrentAuthorContext: vi.fn(),
}));

vi.mock("@react-navigation/native", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      ReactModule.useEffect(() => effect(), [effect]);
    },
  };
});

vi.mock("../../../data/posts", () => ({
  fetchVisiblePostsForCurrentUser: mocks.fetchVisiblePostsForCurrentUser,
}));

vi.mock("../../profile", () => ({
  getProfilePhotoSignedUrl: mocks.getProfilePhotoSignedUrl,
}));

vi.mock("../services/authorContext", () => ({
  resolveCurrentAuthorContext: mocks.resolveCurrentAuthorContext,
}));

import { useFeed } from "./useFeed";

type HookValue = ReturnType<typeof useFeed>;

type VisiblePost = {
  id: string;
  authorUserId: string;
  authorDisplayName: string;
  authorAvatarPath: string | null;
  postType: "text" | "photo";
  body: string | null;
  mediaUrls: string[];
  visibility: "private" | "close_friends" | "followers" | "public";
  createdAt: string;
};

function createPost(id: string, authorUserId: string, authorAvatarPath: string | null): VisiblePost {
  return {
    id,
    authorUserId,
    authorDisplayName: `User ${authorUserId}`,
    authorAvatarPath,
    postType: "text",
    body: `post-${id}`,
    mediaUrls: [],
    visibility: "followers",
    createdAt: "2026-02-24T10:00:00.000Z",
  };
}

function renderUseFeed() {
  let current: HookValue | null = null;

  function HookHarness() {
    current = useFeed();
    return null;
  }

  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(HookHarness));
  });

  return {
    get current() {
      if (!current) {
        throw new Error("Hook state not available yet");
      }
      return current;
    },
    unmount: () => act(() => renderer.unmount()),
  };
}

async function flushAsyncWork(ticks = 6) {
  for (let i = 0; i < ticks; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe("useFeed", () => {
  beforeEach(() => {
    mocks.fetchVisiblePostsForCurrentUser.mockReset();
    mocks.getProfilePhotoSignedUrl.mockReset();
    mocks.resolveCurrentAuthorContext.mockReset();

    mocks.getProfilePhotoSignedUrl.mockResolvedValue({ data: { signedUrl: null } });
    mocks.resolveCurrentAuthorContext.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads initial feed data and clears loading state", async () => {
    const firstPage = Array.from({ length: 10 }).map((_, index) =>
      createPost(`post-${index + 1}`, index < 2 ? "author-a" : `author-${index}`, index < 2 ? "avatars/a.jpg" : null),
    );

    mocks.fetchVisiblePostsForCurrentUser.mockResolvedValue({
      data: {
        items: firstPage,
        nextCursor: 10,
        hasMore: true,
      },
    });
    mocks.resolveCurrentAuthorContext.mockResolvedValue({
      userId: "viewer-1",
      displayName: "Viewer",
      avatarPath: "avatars/viewer.jpg",
      photoUrl: "https://cdn.example.com/viewer.jpg",
      defaultAudienceHint: "Public",
    });
    mocks.getProfilePhotoSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://cdn.example.com/author-a.jpg" },
    });

    const hook = renderUseFeed();
    await flushAsyncWork();

    expect(mocks.fetchVisiblePostsForCurrentUser).toHaveBeenCalledWith({ limit: 10, cursor: 0 });
    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBeNull();
    expect(hook.current.posts).toHaveLength(10);
    expect(hook.current.hasMore).toBe(true);
    expect(hook.current.defaultAudienceHint).toBe("Public");
    expect(hook.current.currentAuthorContext?.userId).toBe("viewer-1");
    expect(hook.current.authorPhotoUrls["viewer-1"]).toBe("https://cdn.example.com/viewer.jpg");
    expect(mocks.getProfilePhotoSignedUrl).toHaveBeenCalledTimes(1);

    hook.unmount();
  });

  it("surfaces initial load errors", async () => {
    mocks.fetchVisiblePostsForCurrentUser.mockResolvedValue({ error: "Feed load failed." });

    const hook = renderUseFeed();
    await flushAsyncWork();

    expect(hook.current.loading).toBe(false);
    expect(hook.current.posts).toEqual([]);
    expect(hook.current.error).toBe("Feed load failed.");
    expect(hook.current.hasMore).toBe(false);
    expect(hook.current.defaultAudienceHint).toBe(DEFAULT_AUDIENCE_HINT);

    hook.unmount();
  });

  it("loads the next page, dedupes post ids, and updates pagination state", async () => {
    const firstPage = Array.from({ length: 10 }).map((_, index) =>
      createPost(`post-${index + 1}`, `author-${index + 1}`, null),
    );
    const nextPage = [
      createPost("post-10", "author-10", null),
      createPost("post-11", "author-11", null),
    ];

    mocks.fetchVisiblePostsForCurrentUser
      .mockResolvedValueOnce({
        data: {
          items: firstPage,
          nextCursor: 10,
          hasMore: true,
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: nextPage,
          nextCursor: null,
          hasMore: false,
        },
      });

    const hook = renderUseFeed();
    await flushAsyncWork();

    await act(async () => {
      await hook.current.handleLoadMore();
    });

    expect(mocks.fetchVisiblePostsForCurrentUser).toHaveBeenNthCalledWith(2, {
      limit: 10,
      cursor: 10,
    });
    expect(hook.current.posts).toHaveLength(11);
    expect(hook.current.posts[10]?.id).toBe("post-11");
    expect(hook.current.hasMore).toBe(false);
    expect(hook.current.error).toBeNull();

    hook.unmount();
  });

  it("keeps current posts and exposes pagination errors", async () => {
    const firstPage = Array.from({ length: 10 }).map((_, index) =>
      createPost(`post-${index + 1}`, `author-${index + 1}`, null),
    );

    mocks.fetchVisiblePostsForCurrentUser
      .mockResolvedValueOnce({
        data: {
          items: firstPage,
          nextCursor: 10,
          hasMore: true,
        },
      })
      .mockResolvedValueOnce({ error: "Pagination failed." });

    const hook = renderUseFeed();
    await flushAsyncWork();

    await act(async () => {
      await hook.current.handleLoadMore();
    });

    expect(hook.current.posts).toHaveLength(10);
    expect(hook.current.error).toBe("Pagination failed.");
    expect(hook.current.loadingMore).toBe(false);

    hook.unmount();
  });
});
