// @ts-nocheck
import { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderTestHook } from "../../../../test/utils/renderHook";

const mocks = vi.hoisted(() => ({
  fetchMembershipTier: vi.fn(),
}));

vi.mock("@react-navigation/native", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      ReactModule.useEffect(() => effect(), [effect]);
    },
  };
});

vi.mock("../../billing", () => ({
  fetchMembershipTier: mocks.fetchMembershipTier,
}));

import { __resetCoachAccessGateCacheForTests, useCoachAccessGate } from "./useCoachAccessGate";

async function flushAsyncWork(ticks = 5) {
  for (let index = 0; index < ticks; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe("useCoachAccessGate", () => {
  beforeEach(() => {
    __resetCoachAccessGateCacheForTests();
    mocks.fetchMembershipTier.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads access gate as ready when membership tier is pro", async () => {
    mocks.fetchMembershipTier.mockResolvedValue({
      data: { tier: "pro" },
    });

    const hook = renderTestHook(() => useCoachAccessGate());
    await flushAsyncWork();

    expect(hook.result.current.viewState).toBe("ready");
    expect(hook.result.current.isPro).toBe(true);
    expect(hook.result.current.tierError).toBeNull();

    hook.unmount();
  });

  it("keeps existing pro access on non-blocking refresh failures", async () => {
    mocks.fetchMembershipTier
      .mockResolvedValueOnce({
        data: { tier: "pro" },
      })
      .mockResolvedValueOnce({
        error: "Temporary network issue.",
      });

    const hook = renderTestHook(() => useCoachAccessGate());
    await flushAsyncWork();

    await act(async () => {
      await hook.result.current.refreshMembershipTier();
    });

    expect(hook.result.current.viewState).toBe("ready");
    expect(hook.result.current.isPro).toBe(true);
    expect(hook.result.current.tierError).toContain("Temporary network issue");

    hook.unmount();
  });

  it("transitions to locked when explicitly forcing free tier", async () => {
    mocks.fetchMembershipTier.mockResolvedValue({
      data: { tier: "pro" },
    });

    const hook = renderTestHook(() => useCoachAccessGate());
    await flushAsyncWork();

    act(() => {
      hook.result.current.lockToFreeTier();
    });

    expect(hook.result.current.viewState).toBe("locked");
    expect(hook.result.current.isPro).toBe(false);

    hook.unmount();
  });

  it("stays in gating on first render even with stale cached free tier", async () => {
    mocks.fetchMembershipTier
      .mockResolvedValueOnce({
        data: { tier: "free" },
      })
      .mockResolvedValueOnce({
        data: { tier: "pro" },
      });

    const firstMount = renderTestHook(() => useCoachAccessGate());
    await flushAsyncWork();
    expect(firstMount.result.current.viewState).toBe("locked");
    firstMount.unmount();

    const secondMount = renderTestHook(() => useCoachAccessGate());
    expect(secondMount.result.current.viewState).toBe("gating");
    await flushAsyncWork();
    expect(secondMount.result.current.viewState).toBe("ready");

    secondMount.unmount();
  });
});
