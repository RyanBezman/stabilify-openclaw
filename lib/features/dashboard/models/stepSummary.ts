export type StepSummaryMode = "today" | "average";

export type StepSummary = {
  enabled: boolean;
  loading: boolean;
  mode: StepSummaryMode;
  steps: number | null;
  target: number;
};

type CreateStepSummaryArgs = {
  enabled: boolean;
  loading: boolean;
  mode: StepSummaryMode;
  steps: number | null;
  target: number;
};

const DEFAULT_DAILY_STEP_TARGET = 10000;

export function resolveStepSummaryMode(optionId: string): StepSummaryMode {
  return optionId === "7d" ? "today" : "average";
}

export function createStepSummary({
  enabled,
  loading,
  mode,
  steps,
  target,
}: CreateStepSummaryArgs): StepSummary {
  return {
    enabled,
    loading,
    mode,
    steps,
    target: target > 0 ? target : DEFAULT_DAILY_STEP_TARGET,
  };
}
