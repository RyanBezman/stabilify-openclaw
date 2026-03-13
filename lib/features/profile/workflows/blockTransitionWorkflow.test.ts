import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
}));

vi.mock("../../../data/relationships", () => ({
  blockUser: mocks.blockUser,
  unblockUser: mocks.unblockUser,
}));

import { blockTransitionWorkflow } from "./blockTransitionWorkflow";

describe("blockTransitionWorkflow", () => {
  beforeEach(() => {
    mocks.blockUser.mockReset();
    mocks.unblockUser.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("blocks a followed user and decrements followers", async () => {
    mocks.blockUser.mockResolvedValue({ data: { ok: true, status: "blocked" } });

    const result = await blockTransitionWorkflow({
      targetUserId: "target-1",
      currentState: "accepted",
    });

    expect(mocks.blockUser).toHaveBeenCalledWith("target-1");
    expect(result).toEqual({
      nextState: "blocked",
      followersDelta: -1,
    });
  });

  it("unblocks back to none", async () => {
    mocks.unblockUser.mockResolvedValue({ data: { ok: true, removed: true } });

    const result = await blockTransitionWorkflow({
      targetUserId: "target-1",
      currentState: "blocked",
    });

    expect(mocks.unblockUser).toHaveBeenCalledWith("target-1");
    expect(result).toEqual({
      nextState: "none",
      followersDelta: 0,
    });
  });
});
