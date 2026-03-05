import { Text, View } from "react-native";
import Card from "../ui/Card";
import SectionTitle from "../ui/SectionTitle";
import type { WeightUnit } from "../../lib/data/types";
import { formatShortDate } from "../../lib/utils/metrics";
import { formatWeight } from "../../lib/utils/weight";

type WeighInItem = {
  localDate: string;
  weight: number;
};

type RecentWeighInsCardProps = {
  weighIns: WeighInItem[];
  unit: WeightUnit;
};

export default function RecentWeighInsCard({
  weighIns,
  unit,
}: RecentWeighInsCardProps) {
  if (weighIns.length === 0) {
    return (
      <Card className="mb-8 p-5">
        <SectionTitle>Recent weigh-ins</SectionTitle>
        <View className="mt-4 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/60 px-4 py-6">
          <Text className="text-sm text-neutral-500">
            No weigh-ins yet. Add your first check-in to start your streak.
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card className="mb-8 p-5">
      <SectionTitle>Recent weigh-ins</SectionTitle>
      <View className="mt-3">
        {weighIns.map((entry, index) => {
          const isLast = index === weighIns.length - 1;
          return (
            <View
              key={entry.localDate}
              className={`flex-row items-center justify-between py-3 ${
                isLast ? "" : "border-b border-neutral-800"
              }`}
            >
              <Text className="text-sm text-neutral-200">
                {formatShortDate(entry.localDate)}
              </Text>
              <Text className="text-sm font-semibold text-white">
                {formatWeight(entry.weight, unit)}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
