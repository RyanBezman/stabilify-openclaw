import type { WeighInCadence } from "../../data/types";
import type { OnboardingInput } from "../../data/onboarding";
import { getLocalTimeZone } from "../../utils/time";
import { formatWeight, parseWeight } from "../../utils/weight";
import {
  createUsernameCandidate,
  getUsernameValidationError,
  normalizeUsername,
} from "../../utils/username";
import type {
  OnboardingState,
  OnboardingStep,
} from "./types";

const DEFAULT_GYM_RADIUS_METERS = 150;

export const ONBOARDING_STEPS: ReadonlyArray<OnboardingStep> = [
  {
    title: "Your profile",
    subtitle: "Tell Stabilify how to label your stats.",
  },
  {
    title: "Your goal",
    subtitle: "Pick a focus and set your target.",
  },
  {
    title: "Your routine",
    subtitle: "Set your cadence and optional proof boosts.",
  },
] as const;

export type OnboardingGoalState = {
  currentWeightValue: number | null;
  targetMinValue: number | null;
  targetMaxValue: number | null;
  targetWeightValue: number | null;
  currentWeightReady: boolean;
  rangeReady: boolean;
  goalReady: boolean;
  isMaintain: boolean;
  goalLabel: "Maintain" | "Lose" | "Gain";
  statusText: string;
  rangeSummary: string;
};

export type OnboardingValidationState = {
  canContinue: boolean;
  canProceed: boolean;
  validationMessage: string | null;
  gymTargetValue: number;
};

export function createInitialOnboardingState(prefillName: string): OnboardingState {
  return {
    displayName: prefillName,
    username: createUsernameCandidate(prefillName),
    preferredUnit: "lb",
    goalType: "maintain",
    currentWeight: "",
    targetMin: "",
    targetMax: "",
    targetWeight: "",
    weighInCadence: "",
    customCadence: "",
    reminderTime: "",
    timezone: getLocalTimeZone(),
    gymProofEnabled: false,
    gymName: "",
    gymSessionsTarget: "4",
    gymPlaceName: "",
    gymPlaceAddress: "",
    gymLat: null,
    gymLng: null,
    gymRadiusM: String(DEFAULT_GYM_RADIUS_METERS),
    gymOptions: [],
    loadingGyms: false,
    gymError: null,
    gymSearch: "",
    gymSelectedId: "",
    showGymList: false,
  };
}

export function getOnboardingGoalState(form: OnboardingState): OnboardingGoalState {
  const targetMinValue = parseWeight(form.targetMin);
  const targetMaxValue = parseWeight(form.targetMax);
  const targetWeightValue = parseWeight(form.targetWeight);
  const currentWeightValue = parseWeight(form.currentWeight);

  const isMaintain = form.goalType === "maintain";
  const rangeReady =
    targetMinValue !== null &&
    targetMaxValue !== null &&
    targetMinValue <= targetMaxValue;
  const goalReady = isMaintain ? rangeReady : targetWeightValue !== null;
  const goalLabel =
    form.goalType === "maintain"
      ? "Maintain"
      : form.goalType === "lose"
        ? "Lose"
        : "Gain";

  const statusText = (() => {
    if (!goalReady) {
      return "Add your target to see your snapshot.";
    }
    if (currentWeightValue === null) {
      if (isMaintain && targetMinValue !== null && targetMaxValue !== null) {
        return `Target range: ${formatWeight(
          targetMinValue,
          form.preferredUnit,
        )} to ${formatWeight(targetMaxValue, form.preferredUnit)}.`;
      }
      if (targetWeightValue !== null) {
        return `Target weight: ${formatWeight(
          targetWeightValue,
          form.preferredUnit,
        )}.`;
      }
      return "Add your target to see your snapshot.";
    }
    if (isMaintain) {
      if (targetMinValue === null || targetMaxValue === null) {
        return "Add your target to see your snapshot.";
      }
      if (currentWeightValue < targetMinValue) {
        const diff = targetMinValue - currentWeightValue;
        return `You are ${formatWeight(diff, form.preferredUnit)} below your zone.`;
      }
      if (currentWeightValue > targetMaxValue) {
        const diff = currentWeightValue - targetMaxValue;
        return `You are ${formatWeight(diff, form.preferredUnit)} above your zone.`;
      }
      return "You are in your zone.";
    }
    if (targetWeightValue === null) {
      return "Add your target to see your snapshot.";
    }
    if (form.goalType === "lose") {
      if (currentWeightValue <= targetWeightValue) {
        return "You're at or below your target.";
      }
      const diff = currentWeightValue - targetWeightValue;
      return `You are ${formatWeight(diff, form.preferredUnit)} above your target.`;
    }
    if (currentWeightValue >= targetWeightValue) {
      return "You're at or above your target.";
    }
    const diff = targetWeightValue - currentWeightValue;
    return `You are ${formatWeight(diff, form.preferredUnit)} below your target.`;
  })();

  const rangeSummary = (() => {
    if (!goalReady) {
      return isMaintain
        ? "Set a target range to get started."
        : "Set a target weight to get started.";
    }
    if (isMaintain) {
      if (targetMinValue === null || targetMaxValue === null) {
        return "Set a target range to get started.";
      }
      return `Stay between ${formatWeight(
        targetMinValue,
        form.preferredUnit,
      )} and ${formatWeight(targetMaxValue, form.preferredUnit)}.`;
    }
    if (targetWeightValue === null) {
      return "Set a target weight to get started.";
    }
    return `${goalLabel} to ${formatWeight(targetWeightValue, form.preferredUnit)}.`;
  })();

  return {
    currentWeightValue,
    targetMinValue,
    targetMaxValue,
    targetWeightValue,
    currentWeightReady: currentWeightValue !== null,
    rangeReady,
    goalReady,
    isMaintain,
    goalLabel,
    statusText,
    rangeSummary,
  };
}

export function getOnboardingCadenceMessage(
  cadence: WeighInCadence | "",
): string {
  if (cadence === "daily") {
    return "Daily weigh-ins power the strongest streaks.";
  }
  if (cadence === "three_per_week") {
    return "Three check-ins weekly keeps your trend steady.";
  }
  if (cadence === "custom") {
    return "Customize the number of check-ins per week.";
  }
  return "Choose how often you plan to weigh in.";
}

export function getOnboardingValidationState(args: {
  form: OnboardingState;
  step: number;
  goal: OnboardingGoalState;
  saving: boolean;
}): OnboardingValidationState {
  const { form, step, goal, saving } = args;

  const displayNameReady = form.displayName.trim().length > 0;
  const usernameError = getUsernameValidationError(form.username);
  const usernameReady = !usernameError;
  const stepTwoReady = goal.isMaintain
    ? goal.currentWeightReady && goal.rangeReady
    : goal.currentWeightReady && goal.targetWeightValue !== null;
  const cadenceReady =
    form.weighInCadence !== "" &&
    (form.weighInCadence !== "custom" ||
      (Number(form.customCadence) > 0 && form.customCadence.trim().length > 0));

  const gymTargetValue = Number(form.gymSessionsTarget);
  const gymTargetReady =
    Number.isFinite(gymTargetValue) && gymTargetValue >= 1 && gymTargetValue <= 7;
  const gymLocationReady = !form.gymProofEnabled
    ? true
    : Boolean(form.gymPlaceName && form.gymLat && form.gymLng);

  const canContinue =
    step === 0
      ? displayNameReady && usernameReady
      : step === 1
        ? stepTwoReady
        : cadenceReady && gymTargetReady && gymLocationReady;

  const validationMessage = (() => {
    if (canContinue) return null;
    if (step === 0) {
      if (!displayNameReady) {
        return "Add a display name to continue.";
      }
      if (usernameError) {
        return usernameError;
      }
      return "Add a display name to continue.";
    }
    if (step === 1 && !goal.currentWeightReady) {
      return "Add your starting weight to continue.";
    }
    if (step === 1 && goal.isMaintain) {
      if (goal.targetMinValue === null || goal.targetMaxValue === null) {
        return "Set your maintenance range to continue.";
      }
      if (goal.targetMinValue > goal.targetMaxValue) {
        return "Minimum should be less than maximum.";
      }
      return "Set your maintenance range to continue.";
    }
    if (step === 1) {
      return "Set a target weight to continue.";
    }
    if (!cadenceReady) {
      return "Pick a weigh-in cadence to continue.";
    }
    if (step === 2 && !gymLocationReady) {
      return "Select a gym location to enable verification.";
    }
    if (step === 2 && !gymTargetReady) {
      return "Set a weekly gym goal between 1 and 7 sessions.";
    }
    return "Complete the required fields to continue.";
  })();

  return {
    canContinue,
    canProceed: canContinue && !saving,
    validationMessage,
    gymTargetValue,
  };
}

export function buildOnboardingInput(args: {
  form: OnboardingState;
  goal: OnboardingGoalState;
  gymTargetValue: number;
}): OnboardingInput {
  const { form, goal, gymTargetValue } = args;

  return {
    displayName: form.displayName.trim(),
    username: normalizeUsername(form.username),
    preferredUnit: form.preferredUnit,
    goalType: form.goalType,
    currentWeight: goal.currentWeightValue ?? 0,
    targetMin: goal.isMaintain ? goal.targetMinValue : null,
    targetMax: goal.isMaintain ? goal.targetMaxValue : null,
    targetWeight: goal.isMaintain ? null : goal.targetWeightValue,
    weighInCadence: form.weighInCadence as WeighInCadence,
    customCadence: form.weighInCadence === "custom" ? Number(form.customCadence) : null,
    reminderTime: form.reminderTime.trim() || null,
    timezone: form.timezone,
    gymProofEnabled: form.gymProofEnabled,
    gymName: form.gymProofEnabled ? form.gymName.trim() || null : null,
    gymSessionsTarget: gymTargetValue || 4,
    gymPlaceName: form.gymProofEnabled ? form.gymPlaceName.trim() || null : null,
    gymPlaceAddress: form.gymProofEnabled
      ? form.gymPlaceAddress.trim() || null
      : null,
    gymLat: form.gymProofEnabled ? form.gymLat : null,
    gymLng: form.gymProofEnabled ? form.gymLng : null,
    gymRadiusM: Number(form.gymRadiusM) || DEFAULT_GYM_RADIUS_METERS,
  };
}
