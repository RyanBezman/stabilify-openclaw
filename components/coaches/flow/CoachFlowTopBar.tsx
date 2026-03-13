import { Ionicons } from "@expo/vector-icons";
import { Animated, Text, TouchableOpacity, View } from "react-native";

type CoachFlowTopBarProps = {
  stepIndex: number;
  totalSteps: number;
  progressAnim: Animated.Value;
  currentStepLabel: string;
  onBack: () => void;
  onClose?: () => void;
  backLabel?: string;
};

export default function CoachFlowTopBar({
  stepIndex,
  totalSteps,
  progressAnim,
  currentStepLabel,
  onBack,
  onClose,
  backLabel = "Back",
}: CoachFlowTopBarProps) {
  return (
    <View className="px-5 pt-4">
      <View className="flex-row items-center justify-between">
        <TouchableOpacity onPress={onBack}>
          <Text className="text-sm font-semibold text-neutral-400">{backLabel}</Text>
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.8px] text-neutral-500">
            Step {stepIndex + 1} of {totalSteps}
          </Text>
          <Text className="mt-0.5 text-xs font-semibold text-neutral-300">
            {currentStepLabel}
          </Text>
        </View>
        {onClose ? (
          <TouchableOpacity
            onPress={onClose}
            className="h-10 w-10 items-center justify-center rounded-full"
            accessibilityRole="button"
            accessibilityLabel="Close onboarding"
          >
            <Ionicons name="close" size={20} color="#a3a3a3" />
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}
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
