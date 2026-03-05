import { Text, View } from "react-native";
import Card from "../ui/Card";
import StreakCard from "../progress/StreakCard";
import StatCard from "../progress/StatCard";
import TrendCard from "../authed/TrendCard";
import GymProgressCard from "../authed/GymProgressCard";
import AccoladeBadge from "../progress/AccoladeBadge";
import type { ProgressModel } from "../../lib/features/profile";

type ProfileProgressSectionProps = {
  refreshError: string | null;
  progressModel: ProgressModel;
};

export default function ProfileProgressSection({
  refreshError,
  progressModel,
}: ProfileProgressSectionProps) {
  const {
    streakDays,
    consistencyPercent,
    consistencyDays,
    consistencyTotalDays,
    trendPoints,
    unit,
    verifiedGymSessions,
    weeklyGymTarget,
    gymWeekLabel,
    todayGymSession,
    accolades,
  } = progressModel;
  const consistencyPercentLabel = `${Math.round(consistencyPercent * 100)}%`;

  return (
    <View>
      {refreshError ? (
        <Card className="mb-4 border-rose-500/40 bg-rose-500/10 p-4">
          <Text className="text-sm text-rose-200">{refreshError}</Text>
        </Card>
      ) : null}

      <View className="mb-6 flex-row gap-3">
        <StreakCard streakDays={streakDays} className="flex-1" />
        <StatCard
          label="Consistency (30d)"
          value={consistencyPercentLabel}
          sublabel={`${consistencyDays} of ${consistencyTotalDays} days logged`}
          tone={consistencyPercent >= 0.7 ? "emerald" : "neutral"}
          className="flex-1"
        />
      </View>

      <TrendCard points={trendPoints} unit={unit} />

      <GymProgressCard
        completed={verifiedGymSessions}
        target={weeklyGymTarget}
        weekLabel={gymWeekLabel}
        lastStatus={todayGymSession?.status}
        lastStatusReason={todayGymSession?.statusReason ?? null}
        lastDistanceMeters={todayGymSession?.distanceMeters ?? null}
        preferredUnit={unit}
      />

      <Card className="mb-8 p-5">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm font-semibold uppercase tracking-[2px] text-neutral-500">
            Accolades
          </Text>
          <Text className="text-xs text-neutral-500">
            {accolades.filter((item) => item.active).length}/{accolades.length} unlocked
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {accolades.map((accolade) => (
            <AccoladeBadge
              key={accolade.key}
              icon={accolade.icon}
              label={accolade.label}
              active={accolade.active}
            />
          ))}
        </View>
      </Card>
    </View>
  );
}
