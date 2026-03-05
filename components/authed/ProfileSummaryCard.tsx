import { Text, View } from "react-native";
import Card from "../ui/Card";
import ProfileAvatar from "../profile/ProfileAvatar";
import type { ProfileSummary } from "../../lib/features/profile";

type ProfileSummaryCardProps = {
  summary: ProfileSummary;
};

export default function ProfileSummaryCard({ summary }: ProfileSummaryCardProps) {
  const {
    displayName,
    initial,
    photoUrl,
    goalLabel,
    goalSummary,
    startWeightLabel,
    startWeightValue,
    targetLabel,
    targetValue,
    targetValueClassName,
    streakDays,
  } = summary;
  const streakLabel =
    streakDays > 0 ? `${streakDays} day${streakDays === 1 ? "" : "s"}` : "—";

  return (
    <Card className="mb-6 p-5">
      <View className="flex-row items-center">
        <ProfileAvatar
          displayName={displayName || initial}
          photoUrl={photoUrl}
          className="mr-4"
        />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-base font-semibold text-white">
            {displayName}
          </Text>
          <Text numberOfLines={2} className="text-sm text-neutral-500">
            {goalLabel} goal: {goalSummary}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-xs uppercase tracking-[2px] text-neutral-500">
            Streak
          </Text>
          <Text className="text-base font-semibold text-white">{streakLabel}</Text>
        </View>
      </View>
      <View className="mt-4 flex-row items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-3">
        <View>
          <Text className="text-xs uppercase tracking-[2px] text-neutral-500">
            {startWeightLabel}
          </Text>
          <Text className="mt-1 text-2xl font-semibold text-white">
            {startWeightValue}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-xs uppercase tracking-[2px] text-neutral-500">
            {targetLabel}
          </Text>
          <Text
            className={`mt-1 text-lg font-semibold ${
              targetValueClassName ?? "text-violet-400"
            }`}
          >
            {targetValue}
          </Text>
        </View>
      </View>
    </Card>
  );
}
