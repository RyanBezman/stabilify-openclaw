// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderTestHook } from "../../../../test/utils/renderHook";

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

describe("useCoachDashboardFocusRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs refresh once per focus callback identity and does not rerun on equivalent rerenders", () => {
    const refreshDashboard = vi.fn(async () => undefined);

    const hook = renderTestHook((props: HarnessProps) => useCoachDashboardFocusRefresh(props), {
      initialProps: {
        coachIdentityKey: "woman:hype",
        forcePicker: false,
        refreshDashboard,
      },
    });

    expect(refreshDashboard).toHaveBeenCalledTimes(1);
    expect(refreshDashboard).toHaveBeenLastCalledWith("refresh");

    hook.rerender({
      coachIdentityKey: "woman:hype",
      forcePicker: false,
      refreshDashboard,
    });
    expect(refreshDashboard).toHaveBeenCalledTimes(1);

    hook.rerender({
      coachIdentityKey: "woman:strict",
      forcePicker: false,
      refreshDashboard,
    });
    expect(refreshDashboard).toHaveBeenCalledTimes(2);
  });

  it("skips refresh when there is no coach identity or picker is forced", () => {
    const refreshDashboard = vi.fn(async () => undefined);

    const hook = renderTestHook((props: HarnessProps) => useCoachDashboardFocusRefresh(props), {
      initialProps: {
        coachIdentityKey: null,
        forcePicker: false,
        refreshDashboard,
      },
    });

    expect(refreshDashboard).not.toHaveBeenCalled();

    hook.rerender({
      coachIdentityKey: "woman:hype",
      forcePicker: true,
      refreshDashboard,
    });
    expect(refreshDashboard).not.toHaveBeenCalled();
  });
});
