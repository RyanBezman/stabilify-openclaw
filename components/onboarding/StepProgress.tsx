import { View } from "react-native";

type StepProgressProps = {
  total: number;
  current: number;
};

export default function StepProgress({ total, current }: StepProgressProps) {
  return (
    <View className="mb-6 flex-row gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={`step-${index}`}
          className={`h-1 flex-1 rounded-full ${
            index <= current ? "bg-violet-500" : "bg-neutral-800"
          }`}
        />
      ))}
    </View>
  );
}
