import { useRef } from "react";
import { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderTestHook } from "../../../../test/utils/renderHook";
import { useCoachWorkspacePlanState } from "./useCoachWorkspacePlanState";

describe("useCoachWorkspacePlanState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("drives the loading stage lifecycle for the current session", async () => {
    const onPlanStart = vi.fn();
    const onPlanSuccess = vi.fn();

    const hook = renderTestHook(() => {
      const sessionTokenRef = useRef(7);
      return {
        sessionTokenRef,
        ...useCoachWorkspacePlanState({
          onPlanStart,
          onPlanSuccess,
          workspaceSessionTokenRef: sessionTokenRef,
        }),
      };
    });

    act(() => {
      hook.result.current.beginPlanLoading("generate");
    });

    expect(onPlanStart).toHaveBeenCalledTimes(1);
    expect(hook.result.current.planStage).toBe("sending");
    expect(hook.result.current.planLoadingAction).toBe("generate");
    expect(hook.result.current.inlinePlanLoadingAction).toBe("generate");

    act(() => {
      hook.result.current.setPlanStage("persisting");
    });

    let closePromise: Promise<void> | null = null;
    await act(async () => {
      closePromise = hook.result.current.closePlanLoadingForSession(7, true, 50);
    });

    expect(onPlanSuccess).toHaveBeenCalledTimes(1);
    expect(hook.result.current.planStage).toBe("done");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
      if (closePromise) {
        await closePromise;
      }
    });

    expect(hook.result.current.planStage).toBe("idle");
    expect(hook.result.current.planLoadingAction).toBeNull();
  });

  it("clears the success chip on a timer and ignores stale session closes", async () => {
    const onPlanStart = vi.fn();
    const onPlanSuccess = vi.fn();

    const hook = renderTestHook(() => {
      const sessionTokenRef = useRef(3);
      return {
        sessionTokenRef,
        ...useCoachWorkspacePlanState({
          onPlanStart,
          onPlanSuccess,
          workspaceSessionTokenRef: sessionTokenRef,
        }),
      };
    });

    act(() => {
      hook.result.current.beginPlanLoading("promote");
      hook.result.current.showPlanSuccess("Draft promoted");
      hook.result.current.sessionTokenRef.current = 4;
    });

    await act(async () => {
      await hook.result.current.closePlanLoadingForSession(3, true, 20);
    });

    expect(onPlanSuccess).not.toHaveBeenCalled();
    expect(hook.result.current.planStage).toBe("sending");
    expect(hook.result.current.planSuccessChip).toBe("Draft promoted");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(hook.result.current.planSuccessChip).toBeNull();
  });
});
