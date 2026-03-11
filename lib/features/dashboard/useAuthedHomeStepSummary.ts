import { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  fetchAppleHealthDailyStepAverage,
  fetchAppleHealthTodayStepCount,
} from "../../data/appleHealth";
import {
  createStepSummary,
  type StepSummary,
  type StepSummaryMode,
} from "./models/stepSummary";

const DEFAULT_DAILY_STEP_TARGET = 10000;

type UseAuthedHomeStepSummaryOptions = {
  appleHealthStepsEnabled: boolean;
  consistencyDays: number;
  dailyStepGoal?: number | null;
  stepSummaryMode: StepSummaryMode;
};

export function useAuthedHomeStepSummary({
  appleHealthStepsEnabled,
  consistencyDays,
  dailyStepGoal,
  stepSummaryMode,
}: UseAuthedHomeStepSummaryOptions): StepSummary {
  const [stepValue, setStepValue] = useState<number | null>(null);
  const [loadingStepSummary, setLoadingStepSummary] = useState(false);
  const stepRequestIdRef = useRef(0);

  useEffect(() => {
    if (!appleHealthStepsEnabled || Platform.OS !== "ios") {
      stepRequestIdRef.current += 1;
      setStepValue(null);
      setLoadingStepSummary(false);
      return;
    }

    const requestId = stepRequestIdRef.current + 1;
    stepRequestIdRef.current = requestId;
    setLoadingStepSummary(true);

    const loadStepSummary = async () => {
      if (stepSummaryMode === "today") {
        const stepResult = await fetchAppleHealthTodayStepCount();
        if (requestId !== stepRequestIdRef.current) {
          return;
        }

        setStepValue(stepResult.error || !stepResult.data ? null : stepResult.data.steps);
        setLoadingStepSummary(false);
        return;
      }

      const stepResult = await fetchAppleHealthDailyStepAverage(consistencyDays);
      if (requestId !== stepRequestIdRef.current) {
        return;
      }

      setStepValue(
        stepResult.error || !stepResult.data ? null : stepResult.data.averageDailySteps,
      );
      setLoadingStepSummary(false);
    };

    void loadStepSummary();
  }, [appleHealthStepsEnabled, consistencyDays, stepSummaryMode]);

  return useMemo(
    () =>
      createStepSummary({
        enabled: appleHealthStepsEnabled,
        loading: loadingStepSummary,
        mode: stepSummaryMode,
        steps: stepValue,
        target: dailyStepGoal ?? DEFAULT_DAILY_STEP_TARGET,
      }),
    [
      appleHealthStepsEnabled,
      dailyStepGoal,
      loadingStepSummary,
      stepSummaryMode,
      stepValue,
    ],
  );
}
