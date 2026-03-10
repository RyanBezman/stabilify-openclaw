import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { HomeConsistencyOption } from "../../lib/features/dashboard";
import Card from "../ui/Card";
import SectionTitle from "../ui/SectionTitle";
import type {
  GymSessionStatus,
  GymSessionStatusReason,
  GymSessionValidationRequestStatus,
} from "../../lib/data/types";
import CircularProgressRing, { type CircularProgressRingTone } from "./CircularProgressRing";

export type ProgressOverviewCardProps = {
  consistencyOptions: HomeConsistencyOption[];
  consistencyOption: HomeConsistencyOption;
  onSelectConsistencyOption: (option: HomeConsistencyOption) => void;
  showConsistencyMenu: boolean;
  onToggleConsistencyMenu: () => void;
  consistencyDaysWithWeighIns: number;
  consistencyTotalDays: number;
  consistencyPercent: number;
  onPressWeighIn: () => void;
  gymCompleted: number;
  gymTarget: number;
  gymWeekLabel: string;
  onLogSession?: () => void;
  onSetupGym?: () => void;
  logSessionEnabled?: boolean;
  onRetry?: () => void;
  onRequestValidation?: () => void;
  requestValidationLoading?: boolean;
  validationRequestStatus?: GymSessionValidationRequestStatus | null;
  gymLastStatus?: GymSessionStatus;
  gymLastStatusReason?: GymSessionStatusReason | null;
  gymLastDistanceMeters?: number | null;
  preferredUnit?: "lb" | "kg";
  steps?: number | null;
  stepsTarget?: number;
  stepsEnabled?: boolean;
  stepsLoading?: boolean;
  onPressSteps?: () => void;
};

function clampProgress(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function resolveGymRingTone(status?: GymSessionStatus): CircularProgressRingTone {
  if (status === "verified") {
    return "emerald";
  }
  if (status === "partial") {
    return "amber";
  }
  if (status === "provisional") {
    return "rose";
  }
  return "emerald";
}

function formatStepValue(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
}

export default function ProgressOverviewCard({
  consistencyOptions,
  consistencyOption,
  onSelectConsistencyOption,
  showConsistencyMenu,
  onToggleConsistencyMenu,
  consistencyDaysWithWeighIns,
  consistencyTotalDays,
  consistencyPercent,
  gymCompleted,
  gymTarget,
  gymWeekLabel,
  gymLastStatus,
  steps,
  stepsTarget = 10000,
  stepsEnabled = false,
  stepsLoading = false,
  onPressSteps,
}: ProgressOverviewCardProps) {
  const consistencyProgress = clampProgress(consistencyPercent);
  const consistencyPercentLabel = Math.round(consistencyProgress * 100);
  const hasGymTarget = gymTarget > 0;
  const safeCompleted = hasGymTarget ? Math.min(gymCompleted, gymTarget) : 0;
  const gymProgress = hasGymTarget ? clampProgress(safeCompleted / gymTarget) : 0;

  const resolvedStatus = hasGymTarget ? gymLastStatus : undefined;
  const hasStepTarget = stepsTarget > 0;
  const resolvedStepValue = steps ?? 0;
  const clampedSteps = Math.max(0, resolvedStepValue);
  const stepsProgress =
    stepsEnabled && hasStepTarget && !stepsLoading && steps !== null
      ? clampProgress(clampedSteps / stepsTarget)
      : 0;
  const stepsValueText = !stepsEnabled
    ? "Off"
    : stepsLoading
      ? "..."
      : steps === null
        ? "—"
        : formatStepValue(clampedSteps);
  const stepsSubText = !stepsEnabled
    ? "Enable"
    : hasStepTarget
      ? `${formatStepValue(clampedSteps)}/${formatStepValue(stepsTarget)}`
      : "No goal";

  return (
    <Card className="mb-6 p-5">
      <View className="mb-3 flex-row items-center justify-between">
        <SectionTitle>Progress</SectionTitle>
        <TouchableOpacity
          testID="progress-overview-consistency-selector"
          activeOpacity={0.8}
          onPress={onToggleConsistencyMenu}
          className="flex-row items-center rounded-full border border-neutral-800 bg-neutral-950/60 px-3 py-1"
        >
          <Text className="text-xs text-neutral-300">{consistencyOption.label}</Text>
          <Text className="ml-2 text-xs text-violet-400">▾</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-start gap-2">
        <View className="flex-1 items-center">
          <CircularProgressRing
            label="Weigh-ins"
            value={consistencyProgress}
            valueText={`${consistencyPercentLabel}%`}
            subText={`${consistencyDaysWithWeighIns}/${consistencyTotalDays}`}
            tone="violet"
            size={86}
            strokeWidth={7}
            animateOnMount
          />
        </View>

        <View className="flex-1 items-center">
          <CircularProgressRing
            label="Gym sessions"
            value={gymProgress}
            valueText={hasGymTarget ? `${Math.round(gymProgress * 100)}%` : "—"}
            subText={hasGymTarget ? `${safeCompleted}/${gymTarget}` : "No goal"}
            tone={resolveGymRingTone(resolvedStatus)}
            size={86}
            strokeWidth={7}
            animateOnMount
          />
        </View>

        <View className="flex-1 items-center">
          <CircularProgressRing
            label="Steps"
            value={stepsProgress}
            valueText={stepsValueText}
            subText={stepsSubText}
            tone="blue"
            progressColor="#AFCBFF"
            size={86}
            strokeWidth={7}
            animateOnMount
            onPress={!stepsEnabled ? onPressSteps : undefined}
            testID={!stepsEnabled ? "progress-overview-steps-ring" : undefined}
          />
        </View>
      </View>

      <Text className="mt-3 text-center text-xs text-neutral-500">{gymWeekLabel}</Text>

      {showConsistencyMenu ? (
        <View className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/90 p-2">
          {consistencyOptions.map((option) => {
            const isActive = option.id === consistencyOption.id;
            return (
              <TouchableOpacity
                key={option.id}
                testID={`progress-overview-consistency-option-${option.id}`}
                activeOpacity={0.8}
                onPress={() => onSelectConsistencyOption(option)}
                className={`rounded-lg px-3 py-2 ${isActive ? "bg-violet-500/20" : ""}`}
              >
                <Text className={`text-sm ${isActive ? "text-white" : "text-neutral-300"}`}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}
