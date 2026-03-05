// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@react-navigation/native", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      ReactModule.useEffect(() => effect(), [effect]);
    },
  };
});

import { useCoachDashboardFocusRefresh } from "./useCoachDashboardFocusRefresh";

type HarnessProps = {
  coachIdentityKey: string | null;
  forcePicker: boolean;
  refreshDashboard: (mode: "load" | "refresh") => Promise<void>;
};

function HookHarness({ coachIdentityKey, forcePicker, refreshDashboard }: HarnessProps) {
  useCoachDashboardFocusRefresh({
    coachIdentityKey,
    forcePicker,
    refreshDashboard,
  });
  return null;
}

describe("useCoachDashboardFocusRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs refresh once per focus callback identity and does not rerun on equivalent rerenders", () => {
    const refreshDashboard = vi.fn(async () => undefined);

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        React.createElement(HookHarness, {
          coachIdentityKey: "woman:hype",
          forcePicker: false,
          refreshDashboard,
        }),
      );
    });
    expect(refreshDashboard).toHaveBeenCalledTimes(1);
    expect(refreshDashboard).toHaveBeenLastCalledWith("refresh");

    act(() => {
      renderer.update(
        React.createElement(HookHarness, {
          coachIdentityKey: "woman:hype",
          forcePicker: false,
          refreshDashboard,
        }),
      );
    });
    expect(refreshDashboard).toHaveBeenCalledTimes(1);

    act(() => {
      renderer.update(
        React.createElement(HookHarness, {
          coachIdentityKey: "woman:strict",
          forcePicker: false,
          refreshDashboard,
        }),
      );
    });
    expect(refreshDashboard).toHaveBeenCalledTimes(2);
  });

  it("skips refresh when there is no coach identity or picker is forced", () => {
    const refreshDashboard = vi.fn(async () => undefined);

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        React.createElement(HookHarness, {
          coachIdentityKey: null,
          forcePicker: false,
          refreshDashboard,
        }),
      );
    });
    expect(refreshDashboard).not.toHaveBeenCalled();

    act(() => {
      renderer.update(
        React.createElement(HookHarness, {
          coachIdentityKey: "woman:hype",
          forcePicker: true,
          refreshDashboard,
        }),
      );
    });
    expect(refreshDashboard).not.toHaveBeenCalled();
  });
});
