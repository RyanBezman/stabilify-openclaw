import { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { renderTestHook } from "../../../../test/utils/renderHook";
import {
  __resetRelationshipSyncEventsForTests,
  publishRelationshipSyncEvent,
} from "../../shared/relationshipSyncEvents";

const mocks = vi.hoisted(() => ({
  fetchActionableNotificationCount: vi.fn(),
  fetchRelationshipCounts: vi.fn(),
  loadOwnProfileWorkflow: vi.fn(),
  refreshOwnProfile: vi.fn(),
  refreshOwnProfileProgressWorkflow: vi.fn(),
}));

vi.mock("../../../data/notifications", () => ({
  fetchActionableNotificationCount: mocks.fetchActionableNotificationCount,
}));

vi.mock("../../../data/relationships", () => ({
  fetchRelationshipCounts: mocks.fetchRelationshipCounts,
}));

vi.mock("../workflows/ownProfileWorkflow", () => ({
  loadOwnProfileWorkflow: mocks.loadOwnProfileWorkflow,
  refreshOwnProfile: mocks.refreshOwnProfile,
  refreshOwnProfileProgressWorkflow: mocks.refreshOwnProfileProgressWorkflow,
}));

import { useOwnProfileQuery } from "./useOwnProfileQuery";

function buildUser(): User {
  return {
    id: "user-1",
    email: "user@example.com",
    user_metadata: {},
  } as User;
}

async function flushAsyncWork(ticks = 6) {
  for (let index = 0; index < ticks; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe("useOwnProfileQuery", () => {
  beforeEach(() => {
    mocks.fetchActionableNotificationCount.mockReset();
    mocks.fetchRelationshipCounts.mockReset();
    mocks.loadOwnProfileWorkflow.mockReset();
    mocks.refreshOwnProfile.mockReset();
    mocks.refreshOwnProfileProgressWorkflow.mockReset();

    mocks.loadOwnProfileWorkflow.mockResolvedValue({
      profileResult: {
        dashboard: null,
        photoUrl: null,
        preserveExistingOnError: false,
      },
      relationshipCountsResult: {
        data: {
          followers: 3,
          following: 4,
          closeFriends: 0,
        },
      },
      notificationCountResult: {
        data: {
          count: 2,
        },
      },
      postCountResult: {
        data: {
          count: 7,
        },
      },
      postsResult: {
        data: {
          items: [],
          nextCursor: null,
          hasMore: false,
        },
      },
      followersCount: 3,
      followingCount: 4,
      pendingFollowRequestsCount: 2,
      postCount: 7,
      postCountKnown: true,
      initialPosts: [],
      postsNextCursor: null,
      hasMorePosts: false,
    });
    mocks.refreshOwnProfile.mockResolvedValue({
      dashboard: null,
      photoUrl: null,
      preserveExistingOnError: false,
    });
    mocks.refreshOwnProfileProgressWorkflow.mockResolvedValue({
      followersCount: null,
      followingCount: null,
    });
    mocks.fetchRelationshipCounts.mockResolvedValue({
      data: {
        followers: 1,
        following: 2,
        closeFriends: 0,
      },
    });
    mocks.fetchActionableNotificationCount.mockResolvedValue({
      data: {
        count: 5,
      },
    });
  });

  afterEach(() => {
    __resetRelationshipSyncEventsForTests();
    vi.clearAllMocks();
  });

  it("refreshes profile social summary after a relationship sync event", async () => {
    const hook = renderTestHook(() =>
      useOwnProfileQuery({
        user: buildUser(),
        postCount: 7,
      }),
    );

    await flushAsyncWork();

    expect(hook.result.current.socialStats[1]?.value).toBe("3");
    expect(hook.result.current.socialStats[2]?.value).toBe("4");
    expect(hook.result.current.pendingFollowRequestsCount).toBe(2);

    await act(async () => {
      publishRelationshipSyncEvent({
        type: "block_state_changed",
        targetUserId: "target-1",
        nextState: "blocked",
      });
      await Promise.resolve();
    });
    await flushAsyncWork();

    expect(mocks.fetchRelationshipCounts).toHaveBeenCalledWith("user-1");
    expect(mocks.fetchActionableNotificationCount).toHaveBeenCalledWith("user-1");
    expect(hook.result.current.socialStats[1]?.value).toBe("1");
    expect(hook.result.current.socialStats[2]?.value).toBe("2");
    expect(hook.result.current.pendingFollowRequestsCount).toBe(5);

    hook.unmount();
  });
});
