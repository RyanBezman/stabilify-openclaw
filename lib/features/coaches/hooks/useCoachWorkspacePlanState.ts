import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { sleep } from "../models/workspaceHelpers";

export type CoachWorkspacePlanLoadingAction =
  | "generate"
  | "revise_days"
  | "promote"
  | "discard"
  | null;

export type CoachWorkspacePlanStage =
  | "idle"
  | "sending"
  | "modeling"
  | "persisting"
  | "done";

type UseCoachWorkspacePlanStateOptions = {
  onPlanStart: () => void;
  onPlanSuccess: () => void;
  workspaceSessionTokenRef: MutableRefObject<number>;
};

export function useCoachWorkspacePlanState({
  onPlanStart,
  onPlanSuccess,
  workspaceSessionTokenRef,
}: UseCoachWorkspacePlanStateOptions) {
  const [planStage, setPlanStage] = useState<CoachWorkspacePlanStage>("idle");
  const [planLoadingAction, setPlanLoadingAction] =
    useState<CoachWorkspacePlanLoadingAction>(null);
  const [planSuccessChip, setPlanSuccessChip] = useState<string | null>(null);
  const chipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (chipTimerRef.current) {
        clearTimeout(chipTimerRef.current);
      }
    };
  }, []);

  const resetPlanState = useCallback(() => {
    if (chipTimerRef.current) {
      clearTimeout(chipTimerRef.current);
      chipTimerRef.current = null;
    }
    setPlanStage("idle");
    setPlanLoadingAction(null);
    setPlanSuccessChip(null);
  }, []);

  const showPlanSuccess = useCallback((message: string) => {
    if (chipTimerRef.current) {
      clearTimeout(chipTimerRef.current);
    }
    setPlanSuccessChip(message);
    chipTimerRef.current = setTimeout(() => {
      setPlanSuccessChip(null);
      chipTimerRef.current = null;
    }, 2000);
  }, []);

  const beginPlanLoading = useCallback(
    (action: CoachWorkspacePlanLoadingAction) => {
      onPlanStart();
      setPlanLoadingAction(action);
      setPlanStage("sending");
    },
    [onPlanStart],
  );

  const closePlanLoadingForSession = useCallback(
    async (sessionToken: number, success: boolean, doneDelayMs = 200) => {
      if (sessionToken !== workspaceSessionTokenRef.current) {
        return;
      }
      if (success) {
        onPlanSuccess();
        setPlanStage("done");
        await sleep(doneDelayMs);
        if (sessionToken !== workspaceSessionTokenRef.current) {
          return;
        }
      }
      setPlanStage("idle");
      setPlanLoadingAction(null);
    },
    [onPlanSuccess, workspaceSessionTokenRef],
  );

  const planLoadingVisible = planStage !== "idle";
  const planBusy = planLoadingVisible;
  const inlinePlanLoadingAction =
    planLoadingVisible && (planLoadingAction === "generate" || planLoadingAction === "revise_days")
      ? planLoadingAction
      : null;
  const showInlinePlanLoading = Boolean(inlinePlanLoadingAction);

  return {
    beginPlanLoading,
    closePlanLoadingForSession,
    inlinePlanLoadingAction,
    planBusy,
    planLoadingAction,
    planLoadingVisible,
    planStage,
    planSuccessChip,
    resetPlanState,
    setPlanStage,
    showInlinePlanLoading,
    showPlanSuccess,
  };
}
