import { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Dispatch, SetStateAction } from "react";
import type { ViewerFollowState } from "../../../data/relationships";
import type { UserDirectoryRow } from "../../../data/userDirectory";
import { renderTestHook } from "../../../../test/utils/renderHook";

const mocks = vi.hoisted(() => ({
  Alert: {
    alert: vi.fn(),
  },
  blockUser: vi.fn(),
  fetchPublicRelationshipCounts: vi.fn(),
  followUser: vi.fn(),
  unblockUser: vi.fn(),
  unfollowUser: vi.fn(),
  cancelFollowRequest: vi.fn(),
}));

vi.mock("react-native", () => ({
  Alert: mocks.Alert,
}));

vi.mock("../../../data/relationships", () => ({
  blockUser: mocks.blockUser,
  fetchPublicRelationshipCounts: mocks.fetchPublicRelationshipCounts,
  followUser: mocks.followUser,
  unblockUser: mocks.unblockUser,
  unfollowUser: mocks.unfollowUser,
  cancelFollowRequest: mocks.cancelFollowRequest,
}));

import { useUserFollowActions } from "./useUserFollowActions";

type FollowHarnessProps = {
  followState: ViewerFollowState;
  setFollowState: Dispatch<SetStateAction<ViewerFollowState>>;
  setFollowersCount: Dispatch<SetStateAction<number>>;
  setFollowingCount: Dispatch<SetStateAction<number>>;
  profile: UserDirectoryRow;
};

function buildProfile(overrides?: Partial<UserDirectoryRow>): UserDirectoryRow {
  return {
    userId: "target-1",
    username: "target_user",
    displayName: "Target User",
    accountVisibility: "public",
    progressVisibility: "public",
    bio: "",
    avatarPath: null,
    updatedAt: "2026-02-25T00:00:00.000Z",
    ...overrides,
  };
}

async function runConfirmationAction(hook: {
  result: {
    current: {
      confirmation: ReturnType<typeof useUserFollowActions>["confirmation"];
      confirmAction: ReturnType<typeof useUserFollowActions>["confirmAction"];
    };
  };
}) {
  if (!hook.result.current.confirmation) {
    throw new Error("Missing confirmation state");
  }

  await act(async () => {
    await hook.result.current.confirmAction();
  });
}

describe("useUserFollowActions", () => {
  beforeEach(() => {
    mocks.Alert.alert.mockReset();
    mocks.blockUser.mockReset();
    mocks.fetchPublicRelationshipCounts.mockReset();
    mocks.followUser.mockReset();
    mocks.unblockUser.mockReset();
    mocks.unfollowUser.mockReset();
    mocks.cancelFollowRequest.mockReset();

    mocks.fetchPublicRelationshipCounts.mockResolvedValue({
      data: {
        followers: 0,
        following: 0,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("transitions from none to accepted and increments followers", async () => {
    mocks.followUser.mockResolvedValue({ data: { ok: true, status: "accepted" } });
    const setFollowState = vi.fn<(value: SetStateAction<ViewerFollowState>) => void>();
    const setFollowersCount = vi.fn<(value: SetStateAction<number>) => void>();
    const setFollowingCount = vi.fn<(value: SetStateAction<number>) => void>();

    const hook = renderTestHook((props: FollowHarnessProps) => useUserFollowActions({
      targetUserId: "target-1",
      profile: props.profile,
      followState: props.followState,
      setFollowState: props.setFollowState,
      setFollowersCount: props.setFollowersCount,
      setFollowingCount: props.setFollowingCount,
    }), {
      initialProps: {
        followState: "none",
        setFollowState,
        setFollowersCount,
        setFollowingCount,
        profile: buildProfile(),
      },
    });

    await act(async () => {
      await hook.result.current.handleFollowPress();
    });

    expect(mocks.followUser).toHaveBeenCalledWith("target-1");
    expect(setFollowState).toHaveBeenCalledWith("accepted");
    const updater = setFollowersCount.mock.calls[0]?.[0] as ((value: number) => number) | undefined;
    expect(typeof updater).toBe("function");
    expect(updater?.(3)).toBe(4);

    hook.unmount();
  });

  it("opens unfollow confirmation and transitions accepted to none", async () => {
    mocks.unfollowUser.mockResolvedValue({ data: { ok: true } });
    const setFollowState = vi.fn<(value: SetStateAction<ViewerFollowState>) => void>();
    const setFollowersCount = vi.fn<(value: SetStateAction<number>) => void>();
    const setFollowingCount = vi.fn<(value: SetStateAction<number>) => void>();

    const hook = renderTestHook((props: FollowHarnessProps) => useUserFollowActions({
      targetUserId: "target-1",
      profile: props.profile,
      followState: props.followState,
      setFollowState: props.setFollowState,
      setFollowersCount: props.setFollowersCount,
      setFollowingCount: props.setFollowingCount,
    }), {
      initialProps: {
        followState: "accepted",
        setFollowState,
        setFollowersCount,
        setFollowingCount,
        profile: buildProfile(),
      },
    });

    await act(async () => {
      await hook.result.current.handleFollowPress();
    });

    expect(hook.result.current.confirmation).toMatchObject({
      title: "Unfollow",
      message: "Unfollow @target_user?",
      confirmLabel: "Unfollow",
      confirmTone: "destructive",
    });

    await runConfirmationAction(hook);

    expect(mocks.unfollowUser).toHaveBeenCalledWith("target-1");
    expect(setFollowState).toHaveBeenCalledWith("none");
    const updater = setFollowersCount.mock.calls[0]?.[0] as ((value: number) => number) | undefined;
    expect(updater?.(0)).toBe(0);
    expect(updater?.(2)).toBe(1);

    hook.unmount();
  });

  it("opens cancel confirmation and transitions pending to none", async () => {
    mocks.cancelFollowRequest.mockResolvedValue({ data: { ok: true } });
    const setFollowState = vi.fn<(value: SetStateAction<ViewerFollowState>) => void>();
    const setFollowersCount = vi.fn<(value: SetStateAction<number>) => void>();
    const setFollowingCount = vi.fn<(value: SetStateAction<number>) => void>();

    const hook = renderTestHook((props: FollowHarnessProps) => useUserFollowActions({
      targetUserId: "target-1",
      profile: props.profile,
      followState: props.followState,
      setFollowState: props.setFollowState,
      setFollowersCount: props.setFollowersCount,
      setFollowingCount: props.setFollowingCount,
    }), {
      initialProps: {
        followState: "pending",
        setFollowState,
        setFollowersCount,
        setFollowingCount,
        profile: buildProfile(),
      },
    });

    await act(async () => {
      await hook.result.current.handleFollowPress();
    });

    expect(hook.result.current.confirmation).toMatchObject({
      title: "Cancel request",
      message: "Cancel follow request to @target_user?",
      confirmLabel: "Cancel request",
      confirmTone: "destructive",
    });

    await runConfirmationAction(hook);

    expect(mocks.cancelFollowRequest).toHaveBeenCalledWith("target-1");
    expect(setFollowState).toHaveBeenCalledWith("none");
    expect(setFollowersCount).not.toHaveBeenCalled();

    hook.unmount();
  });

  it("uses pending when follow service omits status", async () => {
    mocks.followUser.mockResolvedValue({ data: { ok: true } });
    const setFollowState = vi.fn<(value: SetStateAction<ViewerFollowState>) => void>();
    const setFollowersCount = vi.fn<(value: SetStateAction<number>) => void>();
    const setFollowingCount = vi.fn<(value: SetStateAction<number>) => void>();

    const hook = renderTestHook((props: FollowHarnessProps) => useUserFollowActions({
      targetUserId: "target-1",
      profile: props.profile,
      followState: props.followState,
      setFollowState: props.setFollowState,
      setFollowersCount: props.setFollowersCount,
      setFollowingCount: props.setFollowingCount,
    }), {
      initialProps: {
        followState: "none",
        setFollowState,
        setFollowersCount,
        setFollowingCount,
        profile: buildProfile({ accountVisibility: "private" }),
      },
    });

    await act(async () => {
      await hook.result.current.handleFollowPress();
    });

    expect(setFollowState).toHaveBeenCalledWith("pending");
    expect(setFollowersCount).not.toHaveBeenCalled();

    hook.unmount();
  });

  it("blocks a followed user and decrements visible followers", async () => {
    mocks.blockUser.mockResolvedValue({ data: { ok: true, status: "blocked" } });
    mocks.fetchPublicRelationshipCounts.mockResolvedValue({
      data: {
        followers: 0,
        following: 0,
      },
    });
    const setFollowState = vi.fn<(value: SetStateAction<ViewerFollowState>) => void>();
    const setFollowersCount = vi.fn<(value: SetStateAction<number>) => void>();
    const setFollowingCount = vi.fn<(value: SetStateAction<number>) => void>();

    const hook = renderTestHook((props: FollowHarnessProps) => useUserFollowActions({
      targetUserId: "target-1",
      profile: props.profile,
      followState: props.followState,
      setFollowState: props.setFollowState,
      setFollowersCount: props.setFollowersCount,
      setFollowingCount: props.setFollowingCount,
    }), {
      initialProps: {
        followState: "accepted",
        setFollowState,
        setFollowersCount,
        setFollowingCount,
        profile: buildProfile(),
      },
    });

    await act(async () => {
      await hook.result.current.handleBlockPress();
    });

    expect(hook.result.current.confirmation).toMatchObject({
      title: "Block user",
      message: "Block @target_user? They won't be able to follow you or see your profile updates.",
      confirmLabel: "Block",
      confirmTone: "destructive",
    });

    await runConfirmationAction(hook);

    expect(mocks.blockUser).toHaveBeenCalledWith("target-1");
    expect(mocks.fetchPublicRelationshipCounts).toHaveBeenCalledWith("target-1");
    expect(setFollowState).toHaveBeenCalledWith("blocked");
    expect(setFollowersCount).toHaveBeenCalledWith(0);
    expect(setFollowingCount).toHaveBeenCalledWith(0);

    hook.unmount();
  });

  it("unblocks a blocked user back to none", async () => {
    mocks.unblockUser.mockResolvedValue({ data: { ok: true, removed: true } });
    mocks.fetchPublicRelationshipCounts.mockResolvedValue({
      data: {
        followers: 1,
        following: 2,
      },
    });
    const setFollowState = vi.fn<(value: SetStateAction<ViewerFollowState>) => void>();
    const setFollowersCount = vi.fn<(value: SetStateAction<number>) => void>();
    const setFollowingCount = vi.fn<(value: SetStateAction<number>) => void>();

    const hook = renderTestHook((props: FollowHarnessProps) => useUserFollowActions({
      targetUserId: "target-1",
      profile: props.profile,
      followState: props.followState,
      setFollowState: props.setFollowState,
      setFollowersCount: props.setFollowersCount,
      setFollowingCount: props.setFollowingCount,
    }), {
      initialProps: {
        followState: "blocked",
        setFollowState,
        setFollowersCount,
        setFollowingCount,
        profile: buildProfile(),
      },
    });

    expect(hook.result.current.blockButtonLabel).toBe("Unblock user");
    expect(hook.result.current.isBlocked).toBe(true);

    await act(async () => {
      await hook.result.current.handleBlockPress();
    });

    expect(hook.result.current.confirmation).toMatchObject({
      title: "Unblock user",
      message: "Unblock @target_user?",
      confirmLabel: "Unblock",
      confirmTone: "default",
    });

    await runConfirmationAction(hook);

    expect(mocks.unblockUser).toHaveBeenCalledWith("target-1");
    expect(mocks.fetchPublicRelationshipCounts).toHaveBeenCalledWith("target-1");
    expect(setFollowState).toHaveBeenCalledWith("none");
    expect(setFollowersCount).toHaveBeenCalledWith(1);
    expect(setFollowingCount).toHaveBeenCalledWith(2);

    hook.unmount();
  });
});
