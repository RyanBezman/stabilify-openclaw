import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import type { WeeklyCheckin, WeeklyCheckinTrend } from "../../../lib/features/coaches";
import { formatWeight } from "../../../lib/utils/weight";

function trendLabel(trend: WeeklyCheckinTrend) {
  if (trend === "down") return "Down";
  if (trend === "up") return "Up";
  if (trend === "flat") return "Flat";
  return "No data";
}

function trendColorClass(trend: WeeklyCheckinTrend) {
  if (trend === "down") return "text-emerald-300";
  if (trend === "up") return "text-amber-300";
  if (trend === "flat") return "text-neutral-200";
  return "text-neutral-400";
}

function formatReportedCheckinWeight(checkin: WeeklyCheckin) {
  const reportedKg = checkin?.checkinArtifact?.currentWeightKg;
  if (!Number.isFinite(reportedKg)) return null;

  const lb = Number((Number(reportedKg) * 2.2046226218).toFixed(1));
  return `${lb.toFixed(1)} lb`;
}

export default function CheckinSnapshotDetails({
  checkin,
  summaryOverride,
}: {
  checkin: WeeklyCheckin;
  summaryOverride?: string | null;
}) {
  const reportedWeightLabel = formatReportedCheckinWeight(checkin);
  const summaryText = summaryOverride ?? checkin.coachSummary ?? null;

  return (
    <>
      <View className="mt-3 flex-row gap-2">
        <View className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-2">
          <Text className="text-[11px] uppercase tracking-[0.7px] text-neutral-500">Energy</Text>
          <Text className="mt-0.5 text-sm font-semibold text-emerald-200">{checkin.energy}/5</Text>
        </View>
        <View className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-2">
          <Text className="text-[11px] uppercase tracking-[0.7px] text-neutral-500">Adherence</Text>
          <Text className="mt-0.5 text-sm font-semibold text-white">{checkin.adherencePercent}%</Text>
        </View>
        <View className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-2">
          <Text className="text-[11px] uppercase tracking-[0.7px] text-neutral-500">Score</Text>
          <Text className="mt-0.5 text-sm font-semibold text-violet-200">
            {checkin.adherenceScore ?? checkin.adherencePercent}
          </Text>
        </View>
      </View>

      <View className="mt-2.5 rounded-lg border border-neutral-800 bg-neutral-950/70 px-2.5 py-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.8px] text-neutral-500">
            Weight trend
          </Text>
          <Text className={`text-xs font-semibold ${trendColorClass(checkin.weightSnapshot.trend)}`}>
            {trendLabel(checkin.weightSnapshot.trend)}
          </Text>
        </View>
        <View className="mt-2 flex-row flex-wrap gap-2">
          <Text className="text-xs text-neutral-300">
            Start{" "}
            <Text className="font-semibold text-neutral-100">
              {checkin.weightSnapshot.startWeight === null
                ? "-"
                : formatWeight(checkin.weightSnapshot.startWeight, checkin.weightSnapshot.unit)}
            </Text>
          </Text>
          <Text className="text-xs text-neutral-500">•</Text>
          <Text className="text-xs text-neutral-300">
            End{" "}
            <Text className="font-semibold text-neutral-100">
              {checkin.weightSnapshot.endWeight === null
                ? "-"
                : formatWeight(checkin.weightSnapshot.endWeight, checkin.weightSnapshot.unit)}
            </Text>
          </Text>
        </View>
      </View>

      {reportedWeightLabel ? (
        <View className="mt-2.5 rounded-lg border border-violet-500/20 bg-violet-500/5 px-2.5 py-2">
          <Text className="text-[11px] font-semibold uppercase tracking-[0.8px] text-violet-200">
            Reported check-in weight
          </Text>
          <Text className="mt-1 text-xs font-semibold text-violet-100">{reportedWeightLabel}</Text>
        </View>
      ) : null}

      {summaryText ? (
        <View className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="sparkles-outline" size={13} color="#c4b5fd" />
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-violet-200">
              Coach summary
            </Text>
          </View>
          <Text className="mt-2 text-sm leading-relaxed text-neutral-200">{summaryText}</Text>
        </View>
      ) : null}
    </>
  );
}
