import { Text, TouchableOpacity, View } from "react-native";

type OnboardingHeaderProps = {
  title: string;
  subtitle: string;
  step: number;
  totalSteps: number;
  onBack: () => void;
};

export default function OnboardingHeader({
  title,
  subtitle,
  step,
  totalSteps,
  onBack,
}: OnboardingHeaderProps) {
  return (
    <View className="mb-8 flex-row items-center">
      <TouchableOpacity
        onPress={onBack}
        className="mr-4 h-10 w-10 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900"
      >
        <Text className="text-lg text-white">←</Text>
      </TouchableOpacity>
      <View>
        <Text className="text-2xl font-bold text-white">{title}</Text>
        <Text className="mt-1 text-sm text-neutral-500">
          {subtitle} Step {step} of {totalSteps}
        </Text>
      </View>
    </View>
  );
}
