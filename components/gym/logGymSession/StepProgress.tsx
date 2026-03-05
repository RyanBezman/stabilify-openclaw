import { View } from "react-native";

type StepProgressProps = {
  currentStep: number;
  totalSteps?: number;
  className?: string;
};

export default function StepProgress({
  currentStep,
  totalSteps = 3,
  className,
}: StepProgressProps) {
  return (
    <View className={`${className ?? "mb-6"} flex-row items-center gap-2`}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const step = index + 1;
        return (
          <View
            key={step}
            className={`h-1 flex-1 rounded-full ${
              currentStep >= step ? "bg-violet-500" : "bg-neutral-800"
            }`}
          />
        );
      })}
    </View>
  );
}
