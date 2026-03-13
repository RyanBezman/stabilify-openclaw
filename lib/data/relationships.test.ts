import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  followingRange: vi.fn(),
  profileIn: vi.fn(),
}));

vi.mock("../supabase", () => ({
  supabase: {
    auth: {
      getUser: mocks.authGetUser,
    },
    rpc: vi.fn(),
    from: (table: string) => {
      if (table === "follows") {
        const query = {
          eq: (column: string, value: string) => {
            if (column !== "status" || value !== "blocked") {
              return query;
            }
            return query;
          },
          order: () => query,
          range: (from: number, to: number) => mocks.followingRange(from, to),
        };

        return {
          select: () => ({
            eq: (column: string, value: string) => {
              if (column !== "follower_user_id") {
                throw new Error(`Unexpected follows filter column: ${column}`);
              }
              return query;
            },
          }),
        };
      }

      if (table === "profile_directory") {
        return {
          select: () => ({
            in: (column: string, values: string[]) => mocks.profileIn(column, values),
          }),
        };
      }

      throw new Error(`Unexpected table lookup: ${table}`);
    },
  },
}));

import { fetchBlockedProfiles } from "./relationships";

describe("fetchBlockedProfiles", () => {
  beforeEach(() => {
    mocks.authGetUser.mockReset();
    mocks.followingRange.mockReset();
    mocks.profileIn.mockReset();

    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: "viewer-1" } },
      error: null,
    });
  });

  it("maps blocked follow rows into blocked profile entries", async () => {
    mocks.followingRange.mockResolvedValue({
      data: [
        {
          id: "follow-1",
          follower_user_id: "viewer-1",
          followed_user_id: "blocked-1",
          status: "blocked",
          created_at: "2026-03-12T10:00:00.000Z",
          updated_at: "2026-03-12T11:00:00.000Z",
        },
      ],
      error: null,
    });
    mocks.profileIn.mockResolvedValue({
      data: [
        {
          user_id: "blocked-1",
          username: "terence",
          display_name: "Terence Bezman",
          bio: "Bulk mode.",
          avatar_path: "avatars/terence.jpg",
        },
      ],
      error: null,
    });

    const result = await fetchBlockedProfiles({ limit: 50, cursor: 0 });

    expect(mocks.profileIn).toHaveBeenCalledWith("user_id", ["blocked-1"]);
    expect(result).toEqual({
      data: {
        items: [
          {
            id: "follow-1",
            followerUserId: "viewer-1",
            followedUserId: "blocked-1",
            status: "blocked",
            createdAt: "2026-03-12T10:00:00.000Z",
            updatedAt: "2026-03-12T11:00:00.000Z",
            username: "terence",
            displayName: "Terence Bezman",
            bio: "Bulk mode.",
            avatarPath: "avatars/terence.jpg",
          },
        ],
        nextCursor: null,
        hasMore: false,
      },
    });
  });

  it("returns an empty page without profile lookup when no blocked accounts exist", async () => {
    mocks.followingRange.mockResolvedValue({
      data: [],
      error: null,
    });

    const result = await fetchBlockedProfiles({ limit: 50, cursor: 0 });

    expect(mocks.profileIn).not.toHaveBeenCalled();
    expect(result).toEqual({
      data: {
        items: [],
        nextCursor: null,
        hasMore: false,
      },
    });
  });
});
