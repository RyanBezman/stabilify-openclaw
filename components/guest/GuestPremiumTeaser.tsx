import { Text, View } from "react-native";
import Card from "../ui/Card";
import Button from "../ui/Button";

type GuestPremiumTeaserProps = {
  onPress: () => void;
};

const PREMIUM_POINTS = [
  "Get specific next steps based on your weigh-ins and trend.",
  "Course-correct early when your consistency starts to slip.",
] as const;

export default function GuestPremiumTeaser({ onPress }: GuestPremiumTeaserProps) {
  return (
    <Card className="mb-8 overflow-hidden p-0">
      <View className="bg-gradient-to-b from-violet-500/15 to-transparent p-5">
        <View className="self-start rounded-full border border-violet-500/40 bg-violet-500/20 px-3 py-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-violet-200">
            Premium
          </Text>
        </View>

        <Text className="mt-4 text-2xl font-bold tracking-tight text-white">
          AI Coach
        </Text>
        <Text className="mt-2 text-sm leading-6 text-neutral-300">
          Weekly coaching that adapts to your routine and keeps progress moving.
        </Text>

        <View className="mt-4 gap-3">
          {PREMIUM_POINTS.map((point) => (
            <View key={point} className="flex-row items-start">
              <View className="mr-3 mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-300" />
              <Text className="flex-1 text-sm leading-6 text-neutral-300">{point}</Text>
            </View>
          ))}
        </View>

        <Button
          title="See Premium Coaching"
          onPress={onPress}
          className="mt-5"
          textClassName="text-sm tracking-tight"
        />
        <Text className="mt-2 text-center text-xs text-neutral-500">
          Premium upgrade available
        </Text>
      </View>
    </Card>
  );
}
