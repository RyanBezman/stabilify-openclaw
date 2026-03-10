import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import CircularProgressRing from "../../authed/CircularProgressRing";
import SectionTitle from "../../ui/SectionTitle";

export type WeeklyCheckinCardProps = {
  nextDueLabel: string;
  checkinCompleted: boolean;
  planAcceptedThisWeek: boolean | null;
  adherenceScore: number;
  adherenceTrendDirection: "up" | "down" | "flat" | "no_data";
  adherenceTrendDelta: number | null;
  cta: string;
  onPress: () => void;
  title?: string;
  showNextDueLabel?: boolean;
  containerClassName?: string;
};

export default function WeeklyCheckinCard({
  nextDueLabel,
  checkinCompleted,
  planAcceptedThisWeek,
  adherenceScore,
  adherenceTrendDirection,
  adherenceTrendDelta,
  cta,
  onPress,
  title = "Weekly recap",
  showNextDueLabel = true,
  containerClassName,
}: WeeklyCheckinCardProps) {
  const completedLabel = checkinCompleted ? "Yes" : "No";
  const completedColor = checkinCompleted ? "text-emerald-300" : "text-rose-300";
  const planAcceptedLabel =
    planAcceptedThisWeek === true
      ? "Yes"
      : planAcceptedThisWeek === false
        ? "No"
        : "Pending";
  const planAcceptedColor =
    planAcceptedThisWeek === true
      ? "text-emerald-300"
      : planAcceptedThisWeek === false
        ? "text-rose-300"
        : "text-amber-200";
  const adherenceTrendLabel =
    adherenceTrendDirection === "up"
      ? `Up ${adherenceTrendDelta !== null ? `(+${Math.abs(adherenceTrendDelta)})` : ""}`.trim()
      : adherenceTrendDirection === "down"
        ? `Down ${adherenceTrendDelta !== null ? `(-${Math.abs(adherenceTrendDelta)})` : ""}`.trim()
        : adherenceTrendDirection === "flat"
          ? "Flat (No change)"
          : "No trend yet";
  const adherenceTrendColor =
    adherenceTrendDirection === "up"
      ? "text-emerald-300"
      : adherenceTrendDirection === "down"
        ? "text-rose-300"
        : adherenceTrendDirection === "flat"
          ? "text-neutral-300"
          : "text-neutral-400";
  const safeAdherence = Math.max(0, Math.min(100, Math.round(adherenceScore)));
  const ringTone =
    safeAdherence >= 85
      ? "emerald"
      : safeAdherence >= 60
        ? "amber"
        : "rose";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      className={containerClassName ?? "mb-6 px-5"}
    >
      <View className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <View className="flex-row items-center justify-between">
          <SectionTitle>{title}</SectionTitle>
          {showNextDueLabel ? (
            <Text className="text-xs text-neutral-500">{nextDueLabel}</Text>
          ) : null}
        </View>

        <View className="mt-4 flex-row gap-4">
          <View className="shrink-0 justify-center">
            <CircularProgressRing
              label="Adherence"
              value={safeAdherence / 100}
              valueText={`${safeAdherence}%`}
              subText="Latest"
              tone={ringTone}
              size={104}
              strokeWidth={8}
              animateOnMount
            />
          </View>

          <View className="flex-1 justify-center">
            <View className="flex-row items-center justify-between border-b border-neutral-800/80 py-2">
              <Text className="text-sm text-neutral-300">Completed check-in</Text>
              <Text className={`text-sm font-semibold ${completedColor}`}>{completedLabel}</Text>
            </View>
            <View className="flex-row items-center justify-between border-b border-neutral-800/80 py-2">
              <Text className="text-sm text-neutral-300">Plan accepted</Text>
              <Text className={`text-sm font-semibold ${planAcceptedColor}`}>{planAcceptedLabel}</Text>
            </View>
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-sm text-neutral-300">Trend</Text>
              <Text className={`text-sm font-semibold ${adherenceTrendColor}`}>{adherenceTrendLabel}</Text>
            </View>
          </View>
        </View>

        <View className="mt-4 flex-row items-center justify-end">
          <View className="shrink-0 rounded-full border border-violet-500/40 bg-violet-500/20 px-3 py-1">
            <Text className="text-xs font-semibold text-violet-100">
              {cta}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
