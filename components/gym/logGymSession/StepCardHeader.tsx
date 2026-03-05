import { Text, View } from "react-native";

type StepCardHeaderProps = {
  currentStep: number;
  className?: string;
};

function stepTitle(step: number) {
  if (step === 1) return "Take photo";
  if (step === 2) return "Verify location";
  if (step === 3) return "Confirm & save";
  if (step === 4) return "Analyzing";
  return "Log session";
}

export default function StepCardHeader({ currentStep, className }: StepCardHeaderProps) {
  return (
    <View className={`${className ?? "mb-4"} flex-row items-center gap-2`}>
      <View className="h-8 w-8 items-center justify-center rounded-full bg-violet-500">
        <Text className="text-sm font-bold text-white">{currentStep}</Text>
      </View>
      <Text className="text-lg font-bold text-white">
        {stepTitle(currentStep)}
      </Text>
    </View>
  );
}
