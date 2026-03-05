import { Animated, Text, TouchableOpacity, View } from "react-native";

type Props = {
  stepIndex: number;
  totalSteps: number;
  progressAnim: Animated.Value;
  onBack: () => void;
};

export default function OnboardingTopBar({ stepIndex, totalSteps, progressAnim, onBack }: Props) {
  return (
    <View className="px-5 pt-4">
      <View className="flex-row items-center justify-between">
        <TouchableOpacity onPress={onBack}>
          <Text className="text-sm font-semibold text-neutral-400">Back</Text>
        </TouchableOpacity>
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-neutral-500">
          {stepIndex + 1}/{totalSteps}
        </Text>
      </View>
      <View className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-900">
        <Animated.View
          className="h-full rounded-full bg-violet-400"
          style={{
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["8%", "100%"],
            }),
          }}
        />
      </View>
    </View>
  );
}
