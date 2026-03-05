import { useMemo } from "react";
import { Text, View } from "react-native";
import Card from "../ui/Card";
import SectionTitle from "../ui/SectionTitle";
import type { WeightUnit } from "../../lib/data/types";
import { formatWeight } from "../../lib/utils/weight";
import { formatShortDate } from "../../lib/utils/metrics";
import ProgressChart from "../progress/ProgressChart";

type TrendPoint = {
  weight: number;
  localDate: string;
};

type TrendCardProps = {
  points: TrendPoint[];
  unit: WeightUnit;
};

export default function TrendCard({ points: trendPoints, unit }: TrendCardProps) {
  const hasData = trendPoints.length > 0;
  const weights = useMemo(
    () => trendPoints.map((point) => point.weight),
    [trendPoints],
  );
  const minWeight = hasData ? Math.min(...weights) : 0;
  const maxWeight = hasData ? Math.max(...weights) : 0;
  const firstDate = trendPoints[0]?.localDate;
  const lastDate = trendPoints[trendPoints.length - 1]?.localDate;

  if (!hasData) {
    return (
      <Card className="mb-6 p-5">
        <View className="mb-4 flex-row items-center justify-between">
          <SectionTitle>Weight trend</SectionTitle>
          <Text className="text-xs text-neutral-500">No data</Text>
        </View>
        <View className="items-center rounded-xl border border-dashed border-neutral-800 bg-neutral-950/60 px-4 py-6">
          <Text className="text-sm text-neutral-500">
            Log your first weigh-in to see your trend.
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card className="mb-6 p-5">
      <View className="mb-4 flex-row items-center justify-between">
        <SectionTitle>Weight trend</SectionTitle>
        <Text className="text-xs text-neutral-500">
          Range {formatWeight(minWeight, unit)} - {formatWeight(maxWeight, unit)}
        </Text>
      </View>

      <ProgressChart
        points={trendPoints.map((point) => ({
          value: point.weight,
          label: point.localDate,
        }))}
      />

      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-xs text-neutral-500">
          {firstDate ? formatShortDate(firstDate) : ""}
        </Text>
        <Text className="text-xs text-neutral-500">
          {lastDate ? formatShortDate(lastDate) : ""}
        </Text>
      </View>
    </Card>
  );
}
