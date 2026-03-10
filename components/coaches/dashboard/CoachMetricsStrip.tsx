import React from "react";
import { Text, View } from "react-native";
import CircularProgressRing from "../../authed/CircularProgressRing";
import SectionTitle from "../../ui/SectionTitle";

export type CoachMetricsStripProps = {
  adherenceScore: number;
  completionRate: number;
  streak: number;
  caloriesTarget: number | null;
  nextDueLabel: string;
  title?: string | null;
  showDueLabel?: boolean;
  containerClassName?: string;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value <= 0) {
    return 0;
  }

  if (value >= 100) {
    return 100;
  }

  return Math.round(value);
}

function metricTone(value: number) {
  if (value >= 85) {
    return "emerald" as const;
  }
  if (value >= 60) {
    return "blue" as const;
  }
  return "rose" as const;
}

export default function CoachMetricsStrip({
  adherenceScore,
  completionRate,
  streak,
  caloriesTarget,
  nextDueLabel,
  title = "Performance",
  showDueLabel = true,
  containerClassName,
}: CoachMetricsStripProps) {
  const safeAdherence = clampPercent(adherenceScore);
  const safeCompletion = clampPercent(completionRate);
  const caloriesCopy =
    caloriesTarget && caloriesTarget > 0
      ? `${caloriesTarget.toLocaleString()} kcal`
      : "No target yet";

  return (
    <View className={containerClassName ?? "mb-6 px-5"}>
      {title || showDueLabel ? (
        <View className="mb-3 flex-row items-center justify-between">
          {title ? <SectionTitle>{title}</SectionTitle> : <View />}
          {showDueLabel ? (
            <Text className="text-xs text-neutral-500">Due {nextDueLabel}</Text>
          ) : null}
        </View>
      ) : null}

      <View className="flex-row gap-3">
        <View className="flex-1 items-center rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-4">
          <CircularProgressRing
            label="Adherence"
            value={safeAdherence / 100}
            valueText={`${safeAdherence}%`}
            subText="Last check-in"
            tone={metricTone(safeAdherence)}
            size={94}
            strokeWidth={7}
            animateOnMount
          />
        </View>

        <View className="flex-1 items-center rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-4">
          <CircularProgressRing
            label="8wk completion"
            value={safeCompletion / 100}
            valueText={`${safeCompletion}%`}
            subText="Check-ins"
            tone="violet"
            size={94}
            strokeWidth={7}
            animateOnMount
          />
        </View>
      </View>

      <View className="mt-3 flex-row rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3.5">
        <View className="flex-1">
          <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-500">
            Active streak
          </Text>
          <Text className="mt-1 text-xl font-semibold text-white">
            {streak} week{streak === 1 ? "" : "s"}
          </Text>
        </View>
        <View className="mx-2 w-px bg-neutral-800" />
        <View className="flex-1">
          <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-500">
            Nutrition target
          </Text>
          <Text className="mt-1 text-xl font-semibold text-white">{caloriesCopy}</Text>
        </View>
      </View>
    </View>
  );
}
