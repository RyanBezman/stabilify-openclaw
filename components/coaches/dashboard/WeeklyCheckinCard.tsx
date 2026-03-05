import { Text, TouchableOpacity, View } from "react-native";
import Card from "../../ui/Card";
import SectionTitle from "../../ui/SectionTitle";

export default function WeeklyCheckinCard({
  nextDueLabel,
  checkinCompleted,
  planAcceptedThisWeek,
  adherenceTrendDirection,
  adherenceTrendDelta,
  cta,
  onPress,
}: {
  nextDueLabel: string;
  checkinCompleted: boolean;
  planAcceptedThisWeek: boolean | null;
  adherenceTrendDirection: "up" | "down" | "flat" | "no_data";
  adherenceTrendDelta: number | null;
  cta: string;
  onPress: () => void;
}) {
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

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <Card className="mb-6 p-5">
        <View className="flex-row items-center justify-between">
          <SectionTitle>Weekly recap</SectionTitle>
          <Text className="text-xs text-neutral-500">{nextDueLabel}</Text>
        </View>

        <View className="mt-4 gap-3">
          <View className="flex-row items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2.5">
            <Text className="text-sm text-neutral-300">Completed check-in</Text>
            <Text className={`text-sm font-semibold ${completedColor}`}>{completedLabel}</Text>
          </View>
          <View className="flex-row items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2.5">
            <Text className="text-sm text-neutral-300">Plan accepted?</Text>
            <Text className={`text-sm font-semibold ${planAcceptedColor}`}>{planAcceptedLabel}</Text>
          </View>
          <View className="flex-row items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2.5">
            <Text className="text-sm text-neutral-300">Adherence trend</Text>
            <Text className={`text-sm font-semibold ${adherenceTrendColor}`}>{adherenceTrendLabel}</Text>
          </View>
        </View>

        <View className="mt-4 flex-row items-center justify-end">
          <View className="shrink-0 rounded-full border border-violet-500/40 bg-violet-600/20 px-3 py-1">
            <Text className="text-xs font-semibold text-violet-200">
              {cta}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}
