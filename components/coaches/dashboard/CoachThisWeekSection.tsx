import React from "react";
import { Text, View } from "react-native";
import CoachMetricsStrip from "./CoachMetricsStrip";
import type { CoachMetricsStripProps } from "./CoachMetricsStrip";
import SectionTitle from "../../ui/SectionTitle";
import WeeklyCheckinCard from "./WeeklyCheckinCard";
import type { WeeklyCheckinCardProps } from "./WeeklyCheckinCard";

type CoachThisWeekSectionProps = Pick<
  CoachMetricsStripProps,
  "adherenceScore" | "completionRate" | "streak" | "caloriesTarget"
> &
  Pick<
    WeeklyCheckinCardProps,
    | "nextDueLabel"
    | "checkinCompleted"
    | "planAcceptedThisWeek"
    | "adherenceScore"
    | "adherenceTrendDirection"
    | "adherenceTrendDelta"
    | "cta"
    | "onPress"
  >;

export default function CoachThisWeekSection({
  adherenceScore,
  completionRate,
  streak,
  caloriesTarget,
  nextDueLabel,
  checkinCompleted,
  planAcceptedThisWeek,
  adherenceTrendDirection,
  adherenceTrendDelta,
  cta,
  onPress,
}: CoachThisWeekSectionProps) {
  return (
    <View className="mb-6 px-5">
      <View className="mb-3 flex-row items-center justify-between">
        <SectionTitle>This week</SectionTitle>
        <Text className="text-xs text-neutral-500">Due {nextDueLabel}</Text>
      </View>

      <CoachMetricsStrip
        adherenceScore={adherenceScore}
        completionRate={completionRate}
        streak={streak}
        caloriesTarget={caloriesTarget}
        nextDueLabel={nextDueLabel}
        title={null}
        showDueLabel={false}
        containerClassName=""
      />

      <WeeklyCheckinCard
        nextDueLabel={nextDueLabel}
        checkinCompleted={checkinCompleted}
        planAcceptedThisWeek={planAcceptedThisWeek}
        adherenceScore={adherenceScore}
        adherenceTrendDirection={adherenceTrendDirection}
        adherenceTrendDelta={adherenceTrendDelta}
        cta={cta}
        onPress={onPress}
        title="Weekly check-in"
        showNextDueLabel={false}
        containerClassName="mt-3"
      />
    </View>
  );
}
