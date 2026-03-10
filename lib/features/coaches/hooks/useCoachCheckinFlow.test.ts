import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import { useCoachCheckinFlow } from "./useCoachCheckinFlow";
import type { CoachCheckinFlowSnapshot } from "../models/checkinFlow";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type HookValue = ReturnType<typeof useCoachCheckinFlow>;

const baseSnapshot: CoachCheckinFlowSnapshot = {
  energy: 4,
  adherencePercent: "82",
  blockers: "",
  currentWeightInputUnit: "lb",
  v2Form: {
    currentWeight: "180",
    waistCm: "",
    progressPhotoPrompted: false,
    strengthPRs: "",
    consistencyNotes: "",
    bodyCompChanges: "",
    trainingDifficulty: "right",
    nutritionAdherenceSubjective: "medium",
    appetiteCravings: "",
    recoveryRating: 3,
    sleepAvgHours: "7",
    sleepQuality: 3,
    stressLevel: 3,
    scheduleConstraintsNextWeek: "",
    injuryHasPain: false,
    injuryDetails: "",
    injuryRedFlags: false,
  },
};

function renderUseCoachCheckinFlow(snapshot?: CoachCheckinFlowSnapshot) {
  let current: HookValue | null = null;
  let latestSnapshot = snapshot ?? baseSnapshot;

  function HookHarness({ flowSnapshot }: { flowSnapshot: CoachCheckinFlowSnapshot }) {
    current = useCoachCheckinFlow({ snapshot: flowSnapshot });
    return null;
  }

  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(HookHarness, { flowSnapshot: latestSnapshot }),
    );
  });

  return {
    get current() {
      if (!current) {
        throw new Error("Hook state not available yet");
      }
      return current;
    },
    updateSnapshot(nextSnapshot: CoachCheckinFlowSnapshot) {
      latestSnapshot = nextSnapshot;
      act(() => {
        renderer.update(
          React.createElement(HookHarness, { flowSnapshot: latestSnapshot }),
        );
      });
    },
    unmount() {
      act(() => renderer.unmount());
    },
  };
}

describe("useCoachCheckinFlow", () => {
  it("starts in overview mode on the first step with the correct progress", () => {
    const hook = renderUseCoachCheckinFlow();

    expect(hook.current.mode).toBe("overview");
    expect(hook.current.currentStep).toBe("body_metrics");
    expect(hook.current.stepIndex).toBe(0);
    expect(hook.current.progress).toBe(1 / 7);
    expect(hook.current.canContinue).toBe(true);

    hook.unmount();
  });

  it("moves forward and exits to overview when backing out of the first step", () => {
    const hook = renderUseCoachCheckinFlow();

    act(() => {
      hook.current.openWizard();
      hook.current.next();
    });

    expect(hook.current.mode).toBe("wizard");
    expect(hook.current.currentStep).toBe("training_recap");

    act(() => {
      hook.current.back();
    });
    expect(hook.current.currentStep).toBe("body_metrics");

    act(() => {
      hook.current.back();
    });
    expect(hook.current.mode).toBe("overview");
    expect(hook.current.currentStep).toBe("body_metrics");

    hook.unmount();
  });

  it("resumes the last step after closing and reopening the wizard", () => {
    const hook = renderUseCoachCheckinFlow();

    act(() => {
      hook.current.openWizard();
      hook.current.next();
      hook.current.next();
      hook.current.closeWizard();
    });

    expect(hook.current.mode).toBe("overview");
    expect(hook.current.currentStep).toBe("nutrition_recap");

    act(() => {
      hook.current.openWizard();
    });

    expect(hook.current.mode).toBe("wizard");
    expect(hook.current.currentStep).toBe("nutrition_recap");
    expect(hook.current.stepIndex).toBe(2);

    hook.unmount();
  });

  it("supports jumping back from review to an earlier step", () => {
    const hook = renderUseCoachCheckinFlow();

    act(() => {
      hook.current.openWizard();
      hook.current.goToStep("review");
    });

    expect(hook.current.isReviewStep).toBe(true);
    expect(hook.current.currentStep).toBe("review");

    act(() => {
      hook.current.goToStep("nutrition_recap");
    });

    expect(hook.current.isReviewStep).toBe(false);
    expect(hook.current.currentStep).toBe("nutrition_recap");

    hook.unmount();
  });

  it("blocks continuation when current weight is out of range", () => {
    const hook = renderUseCoachCheckinFlow({
      ...baseSnapshot,
      v2Form: {
        ...baseSnapshot.v2Form,
        currentWeight: "20",
      },
    });

    act(() => {
      hook.current.openWizard();
    });

    expect(hook.current.currentStep).toBe("body_metrics");
    expect(hook.current.canContinue).toBe(false);
    expect(hook.current.validationError).toBe(
      "Current weight must be between 66.1 and 771.6 lb.",
    );

    hook.unmount();
  });

  it("blocks continuation on the recovery step when sleep hours are invalid", () => {
    const hook = renderUseCoachCheckinFlow({
      ...baseSnapshot,
      v2Form: {
        ...baseSnapshot.v2Form,
        sleepAvgHours: "25",
      },
    });

    act(() => {
      hook.current.openWizard();
      hook.current.goToStep("recovery");
    });

    expect(hook.current.currentStep).toBe("recovery");
    expect(hook.current.canContinue).toBe(false);
    expect(hook.current.validationError).toBe(
      "Sleep average hours must be between 0 and 24.",
    );

    hook.unmount();
  });

  it("requires pain details when pain is reported", () => {
    const hook = renderUseCoachCheckinFlow({
      ...baseSnapshot,
      v2Form: {
        ...baseSnapshot.v2Form,
        injuryHasPain: true,
        injuryDetails: "",
      },
    });

    act(() => {
      hook.current.openWizard();
      hook.current.goToStep("pain_safety");
    });

    expect(hook.current.currentStep).toBe("pain_safety");
    expect(hook.current.canContinue).toBe(false);
    expect(hook.current.validationError).toBe(
      "Add a short note about where or when the pain shows up.",
    );

    hook.unmount();
  });
});
