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

function MetricCard({
  label,
  value,
  toneClassName = "text-white",
  detail,
}: {
  label: string;
  value: string;
  toneClassName?: string;
  detail?: string | null;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4">
      <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-500">
        {label}
      </Text>
      <Text className={`mt-2 text-lg font-semibold ${toneClassName}`}>{value}</Text>
      {detail ? (
        <Text className="mt-2 text-sm leading-5 text-neutral-500">{detail}</Text>
      ) : null}
    </View>
  );
}

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
      <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-neutral-500">
        {label}
      </Text>
      <Text className="mt-2 text-sm leading-relaxed text-neutral-200">{value}</Text>
    </View>
  );
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
  const weightTrendDetail = `Start ${
    checkin.weightSnapshot.startWeight === null
      ? "-"
      : formatWeight(checkin.weightSnapshot.startWeight, checkin.weightSnapshot.unit)
  } • End ${
    checkin.weightSnapshot.endWeight === null
      ? "-"
      : formatWeight(checkin.weightSnapshot.endWeight, checkin.weightSnapshot.unit)
  }`;

  return (
    <View className="gap-3 px-5 py-5">
      <View className="flex-row gap-3">
        <MetricCard label="Energy" value={`${checkin.energy}/5`} toneClassName="text-emerald-300" />
        <MetricCard label="Adherence" value={`${checkin.adherencePercent}%`} />
      </View>
      <View className="flex-row gap-3">
        <MetricCard
          label="Score"
          value={String(checkin.adherenceScore ?? checkin.adherencePercent)}
          toneClassName="text-violet-300"
        />
        <MetricCard
          label="Weight trend"
          value={trendLabel(checkin.weightSnapshot.trend)}
          toneClassName={trendColorClass(checkin.weightSnapshot.trend)}
          detail={weightTrendDetail}
        />
      </View>
      {reportedWeightLabel ? (
        <MetricCard
          label="Reported check-in weight"
          value={reportedWeightLabel}
          toneClassName="text-violet-300"
        />
      ) : null}
      {summaryText ? <DetailBlock label="Coach summary" value={summaryText} /> : null}
    </View>
  );
}
