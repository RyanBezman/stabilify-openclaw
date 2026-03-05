import { Text, View } from "react-native";
import Card from "../ui/Card";

type InfoBannerProps = {
  cadenceSummary: string;
  reminderSummary: string;
};

export default function InfoBanner({
  cadenceSummary,
  reminderSummary,
}: InfoBannerProps) {
  return (
    <Card className="mb-8 flex-row items-center p-4">
      <View className="mr-3 h-2 w-2 rounded-full bg-green-400" />
      <Text className="flex-1 text-sm text-neutral-400">
        <Text className="font-semibold text-white">Cadence:</Text>{" "}
        {cadenceSummary}
      </Text>
      <Text className="text-sm font-medium text-violet-400">
        {reminderSummary}
      </Text>
    </Card>
  );
}
