import { Text, View } from "react-native";
import Card from "../ui/Card";
import SectionTitle from "../ui/SectionTitle";
import AccoladeBadge from "../progress/AccoladeBadge";

export default function StreakBoostCard() {
  return (
    <Card className="mb-8 p-5">
      <SectionTitle>Streak boost</SectionTitle>
      <Text className="mt-2 text-base text-white">
        Keep your streak alive with a daily weigh-in.
      </Text>
      <Text className="mt-2 text-sm text-neutral-400">
        Add optional gym proof: snap a photo + share location.
      </Text>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <AccoladeBadge icon="⚖️" label="Daily check-ins" active />
        <AccoladeBadge icon="📸" label="Photo proof" active />
        <AccoladeBadge icon="📍" label="Gym location" active />
      </View>
    </Card>
  );
}
