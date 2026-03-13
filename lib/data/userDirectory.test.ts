import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  blockedStatusEq: vi.fn(),
  profileNot: vi.fn(),
  profileRange: vi.fn(),
}));

vi.mock("../supabase", () => ({
  supabase: {
    auth: {
      getUser: mocks.authGetUser,
    },
    from: (table: string) => {
      if (table === "follows") {
        return {
          select: () => ({
            eq: (column: string, value: string) => {
              if (column !== "follower_user_id") {
                throw new Error(`Unexpected follows filter column: ${column}`);
              }

              return {
                eq: (statusColumn: string, statusValue: string) =>
                  mocks.blockedStatusEq(statusColumn, statusValue, value),
              };
            },
          }),
        };
      }

      if (table === "profile_directory") {
        const query = {
          ilike: () => query,
          order: () => query,
          not: (column: string, operator: string, value: string) => {
            mocks.profileNot(column, operator, value);
            return query;
          },
          range: (from: number, to: number) => mocks.profileRange(from, to),
        };

        return {
          select: () => query,
        };
      }

      throw new Error(`Unexpected table lookup: ${table}`);
    },
  },
}));

import { searchUsersByUsernamePrefix } from "./userDirectory";

describe("searchUsersByUsernamePrefix", () => {
  beforeEach(() => {
    mocks.authGetUser.mockReset();
    mocks.blockedStatusEq.mockReset();
    mocks.profileNot.mockReset();
    mocks.profileRange.mockReset();

    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: "viewer-1" } },
      error: null,
    });
  });

  it("excludes the current user's blocked accounts from search results", async () => {
    mocks.blockedStatusEq.mockResolvedValue({
      data: [{ followed_user_id: "blocked-1" }],
      error: null,
    });
    mocks.profileRange.mockResolvedValue({
      data: [
        {
          user_id: "user-2",
          username: "terry",
          display_name: "Terry Example",
          bio: "Bio",
          avatar_path: null,
          account_visibility: "public",
          progress_visibility: "public",
          updated_at: "2026-03-12T12:00:00.000Z",
        },
      ],
      error: null,
    });

    const result = await searchUsersByUsernamePrefix("ter", { limit: 20, cursor: 0 });

    expect(mocks.profileNot).toHaveBeenCalledWith("user_id", "in", "(blocked-1)");
    expect(result).toEqual({
      data: {
        items: [
          {
            userId: "user-2",
            username: "terry",
            displayName: "Terry Example",
            bio: "Bio",
            avatarPath: null,
            accountVisibility: "public",
            progressVisibility: "public",
            updatedAt: "2026-03-12T12:00:00.000Z",
          },
        ],
        nextCursor: null,
        hasMore: false,
      },
    });
  });

  it("skips the exclusion filter when the viewer has no blocked accounts", async () => {
    mocks.blockedStatusEq.mockResolvedValue({
      data: [],
      error: null,
    });
    mocks.profileRange.mockResolvedValue({
      data: [],
      error: null,
    });

    await searchUsersByUsernamePrefix("ter", { limit: 20, cursor: 0 });

    expect(mocks.profileNot).not.toHaveBeenCalled();
    expect(mocks.profileRange).toHaveBeenCalledWith(0, 19);
  });
});
