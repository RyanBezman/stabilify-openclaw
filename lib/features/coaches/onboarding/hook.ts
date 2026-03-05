import { useMemo, useReducer } from "react";
import {
  COACH_ONBOARDING_STEPS,
  createInitialCoachOnboardingDraft,
  type CoachOnboardingDraft,
} from "./models";
import { validateCoachOnboardingStep } from "./validation";

type State = {
  stepIndex: number;
  draft: CoachOnboardingDraft;
  submitting: boolean;
  error: string | null;
};

type Action =
  | { type: "set"; draft: CoachOnboardingDraft }
  | { type: "patch"; updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft }
  | { type: "next" }
  | { type: "back" }
  | { type: "submit_start" }
  | { type: "submit_error"; error: string }
  | { type: "submit_done" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "set":
      return { ...state, draft: action.draft };
    case "patch":
      return { ...state, draft: action.updater(state.draft), error: null };
    case "next":
      return { ...state, stepIndex: Math.min(state.stepIndex + 1, COACH_ONBOARDING_STEPS.length - 1), error: null };
    case "back":
      return { ...state, stepIndex: Math.max(0, state.stepIndex - 1), error: null };
    case "submit_start":
      return { ...state, submitting: true, error: null };
    case "submit_error":
      return { ...state, submitting: false, error: action.error };
    case "submit_done":
      return { ...state, submitting: false, error: null };
    default:
      return state;
  }
}

export function useCoachOnboarding() {
  const [state, dispatch] = useReducer(reducer, {
    stepIndex: 0,
    draft: createInitialCoachOnboardingDraft(),
    submitting: false,
    error: null,
  });

  const currentStep = COACH_ONBOARDING_STEPS[state.stepIndex];
  const validationError = validateCoachOnboardingStep(currentStep, state.draft);

  return {
    stepIndex: state.stepIndex,
    totalSteps: COACH_ONBOARDING_STEPS.length,
    currentStep,
    draft: state.draft,
    validationError,
    submitting: state.submitting,
    submitError: state.error,
    canContinue: !validationError,
    progress: (state.stepIndex + 1) / COACH_ONBOARDING_STEPS.length,
    patchDraft: (updater: (draft: CoachOnboardingDraft) => CoachOnboardingDraft) =>
      dispatch({ type: "patch", updater }),
    next: () => dispatch({ type: "next" }),
    back: () => dispatch({ type: "back" }),
    setDraft: (draft: CoachOnboardingDraft) => dispatch({ type: "set", draft }),
    setSubmitStart: () => dispatch({ type: "submit_start" }),
    setSubmitDone: () => dispatch({ type: "submit_done" }),
    setSubmitError: (error: string) => dispatch({ type: "submit_error", error }),
    isLastStep: state.stepIndex === COACH_ONBOARDING_STEPS.length - 1,
  };
}
