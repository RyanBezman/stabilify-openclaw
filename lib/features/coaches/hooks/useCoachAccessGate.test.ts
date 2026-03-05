// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

import {
  __resetCoachAccessGateCacheForTests,
  useCoachAccessGate,
} from "./useCoachAccessGate";

type HookValue = ReturnType<typeof useCoachAccessGate>;

function renderUseCoachAccessGate() {
  let current: HookValue | null = null;

  function HookHarness() {
    current = useCoachAccessGate();
    return null;
  }

  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(HookHarness));
  });

  return {
    get current() {
      if (!current) throw new Error("Hook state not available yet");
      return current;
    },
    unmount: () => act(() => renderer.unmount()),
  };
}

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

    const hook = renderUseCoachAccessGate();
    await flushAsyncWork();

    expect(hook.current.viewState).toBe("ready");
    expect(hook.current.isPro).toBe(true);
    expect(hook.current.tierError).toBeNull();

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

    const hook = renderUseCoachAccessGate();
    await flushAsyncWork();

    await act(async () => {
      await hook.current.refreshMembershipTier();
    });

    expect(hook.current.viewState).toBe("ready");
    expect(hook.current.isPro).toBe(true);
    expect(hook.current.tierError).toContain("Temporary network issue");

    hook.unmount();
  });

  it("transitions to locked when explicitly forcing free tier", async () => {
    mocks.fetchMembershipTier.mockResolvedValue({
      data: { tier: "pro" },
    });

    const hook = renderUseCoachAccessGate();
    await flushAsyncWork();

    act(() => {
      hook.current.lockToFreeTier();
    });

    expect(hook.current.viewState).toBe("locked");
    expect(hook.current.isPro).toBe(false);

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

    const firstMount = renderUseCoachAccessGate();
    await flushAsyncWork();
    expect(firstMount.current.viewState).toBe("locked");
    firstMount.unmount();

    const secondMount = renderUseCoachAccessGate();
    expect(secondMount.current.viewState).toBe("gating");
    await flushAsyncWork();
    expect(secondMount.current.viewState).toBe("ready");

    secondMount.unmount();
  });
});
