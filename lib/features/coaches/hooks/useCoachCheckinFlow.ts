import { useMemo, useReducer } from "react";
import {
  buildCoachCheckinReviewSections,
  buildCoachCheckinSummaryChips,
  COACH_CHECKIN_STEPS,
  getCoachCheckinStepDefinition,
  type CoachCheckinFlowMode,
  type CoachCheckinFlowSnapshot,
  type CoachCheckinStepId,
  validateCoachCheckinStep,
} from "../models/checkinFlow";

type State = {
  mode: CoachCheckinFlowMode;
  stepIndex: number;
};

type Action =
  | { type: "open"; stepIndex?: number }
  | { type: "close" }
  | { type: "next" }
  | { type: "back" }
  | { type: "go_to"; stepIndex: number }
  | { type: "submit_complete" };

function clampStepIndex(stepIndex: number) {
  return Math.min(
    COACH_CHECKIN_STEPS.length - 1,
    Math.max(0, stepIndex),
  );
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "open":
      return {
        ...state,
        mode: "wizard",
        stepIndex:
          action.stepIndex === undefined
            ? state.stepIndex
            : clampStepIndex(action.stepIndex),
      };
    case "close":
      return { ...state, mode: "overview" };
    case "next":
      return {
        ...state,
        stepIndex: clampStepIndex(state.stepIndex + 1),
      };
    case "back":
      if (state.stepIndex === 0) {
        return { ...state, mode: "overview" };
      }
      return {
        ...state,
        stepIndex: clampStepIndex(state.stepIndex - 1),
      };
    case "go_to":
      return {
        ...state,
        mode: "wizard",
        stepIndex: clampStepIndex(action.stepIndex),
      };
    case "submit_complete":
      return {
        mode: "overview",
        stepIndex: 0,
      };
    default:
      return state;
  }
}

type UseCoachCheckinFlowOptions = {
  snapshot: CoachCheckinFlowSnapshot;
};

export function useCoachCheckinFlow({
  snapshot,
}: UseCoachCheckinFlowOptions) {
  const [state, dispatch] = useReducer(reducer, {
    mode: "overview" as CoachCheckinFlowMode,
    stepIndex: 0,
  });

  const currentStep = COACH_CHECKIN_STEPS[state.stepIndex];
  const validationError = useMemo(
    () => validateCoachCheckinStep(currentStep, snapshot),
    [currentStep, snapshot],
  );

  return {
    mode: state.mode,
    stepIndex: state.stepIndex,
    totalSteps: COACH_CHECKIN_STEPS.length,
    currentStep,
    progress: (state.stepIndex + 1) / COACH_CHECKIN_STEPS.length,
    stepDefinition: getCoachCheckinStepDefinition(currentStep),
    summaryChips: buildCoachCheckinSummaryChips(snapshot),
    reviewSections: buildCoachCheckinReviewSections(snapshot),
    validationError,
    canContinue: !validationError,
    isLastStep: state.stepIndex === COACH_CHECKIN_STEPS.length - 1,
    isReviewStep: currentStep === "review",
    openWizard: (stepId?: CoachCheckinStepId) =>
      dispatch({
        type: "open",
        stepIndex:
          stepId === undefined ? undefined : COACH_CHECKIN_STEPS.indexOf(stepId),
      }),
    closeWizard: () => dispatch({ type: "close" }),
    next: () => dispatch({ type: "next" }),
    back: () => dispatch({ type: "back" }),
    goToStep: (stepId: CoachCheckinStepId) =>
      dispatch({
        type: "go_to",
        stepIndex: COACH_CHECKIN_STEPS.indexOf(stepId),
      }),
    resetAfterSuccessfulSubmit: () => dispatch({ type: "submit_complete" }),
  };
}
