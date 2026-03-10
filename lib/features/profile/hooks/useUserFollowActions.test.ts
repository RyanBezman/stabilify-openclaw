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
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  cancelFollowRequest: vi.fn(),
}));

vi.mock("react-native", () => ({
  Alert: mocks.Alert,
}));

vi.mock("../../../data/relationships", () => ({
  followUser: mocks.followUser,
  unfollowUser: mocks.unfollowUser,
  cancelFollowRequest: mocks.cancelFollowRequest,
}));

import { useUserFollowActions } from "./useUserFollowActions";

type FollowHarnessProps = {
  followState: ViewerFollowState;
  setFollowState: Dispatch<SetStateAction<ViewerFollowState>>;
  setFollowersCount: Dispatch<SetStateAction<number>>;
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

async function runAlertAction(buttonLabel: string) {
  const buttons = mocks.Alert.alert.mock.calls[0]?.[2] as
    | Array<{ text?: string; onPress?: () => void | Promise<void> }>
    | undefined;
  const button = buttons?.find((entry) => entry.text === buttonLabel);
  if (!button?.onPress) {
    throw new Error(`Missing alert action: ${buttonLabel}`);
  }

  await act(async () => {
    await button.onPress?.();
  });
}

describe("useUserFollowActions", () => {
  beforeEach(() => {
    mocks.Alert.alert.mockReset();
    mocks.followUser.mockReset();
    mocks.unfollowUser.mockReset();
    mocks.cancelFollowRequest.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("transitions from none to accepted and increments followers", async () => {
    mocks.followUser.mockResolvedValue({ data: { ok: true, status: "accepted" } });
    const setFollowState = vi.fn<(value: SetStateAction<ViewerFollowState>) => void>();
    const setFollowersCount = vi.fn<(value: SetStateAction<number>) => void>();

    const hook = renderTestHook((props: FollowHarnessProps) => useUserFollowActions({
      targetUserId: "target-1",
      profile: props.profile,
      followState: props.followState,
      setFollowState: props.setFollowState,
      setFollowersCount: props.setFollowersCount,
    }), {
      initialProps: {
        followState: "none",
        setFollowState,
        setFollowersCount,
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

    const hook = renderTestHook((props: FollowHarnessProps) => useUserFollowActions({
      targetUserId: "target-1",
      profile: props.profile,
      followState: props.followState,
      setFollowState: props.setFollowState,
      setFollowersCount: props.setFollowersCount,
    }), {
      initialProps: {
        followState: "accepted",
        setFollowState,
        setFollowersCount,
        profile: buildProfile(),
      },
    });

    await act(async () => {
      await hook.result.current.handleFollowPress();
    });

    expect(mocks.Alert.alert).toHaveBeenCalledWith("Unfollow", "Unfollow @target_user?", expect.any(Array));

    await runAlertAction("Unfollow");

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

    const hook = renderTestHook((props: FollowHarnessProps) => useUserFollowActions({
      targetUserId: "target-1",
      profile: props.profile,
      followState: props.followState,
      setFollowState: props.setFollowState,
      setFollowersCount: props.setFollowersCount,
    }), {
      initialProps: {
        followState: "pending",
        setFollowState,
        setFollowersCount,
        profile: buildProfile(),
      },
    });

    await act(async () => {
      await hook.result.current.handleFollowPress();
    });

    expect(mocks.Alert.alert).toHaveBeenCalledWith("Cancel request", "Cancel follow request to @target_user?", expect.any(Array));

    await runAlertAction("Cancel request");

    expect(mocks.cancelFollowRequest).toHaveBeenCalledWith("target-1");
    expect(setFollowState).toHaveBeenCalledWith("none");
    expect(setFollowersCount).not.toHaveBeenCalled();

    hook.unmount();
  });

  it("uses pending when follow service omits status", async () => {
    mocks.followUser.mockResolvedValue({ data: { ok: true } });
    const setFollowState = vi.fn<(value: SetStateAction<ViewerFollowState>) => void>();
    const setFollowersCount = vi.fn<(value: SetStateAction<number>) => void>();

    const hook = renderTestHook((props: FollowHarnessProps) => useUserFollowActions({
      targetUserId: "target-1",
      profile: props.profile,
      followState: props.followState,
      setFollowState: props.setFollowState,
      setFollowersCount: props.setFollowersCount,
    }), {
      initialProps: {
        followState: "none",
        setFollowState,
        setFollowersCount,
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
});
