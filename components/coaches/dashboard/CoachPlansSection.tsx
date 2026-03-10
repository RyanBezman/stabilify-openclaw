import type { ReactNode } from "react";
import { Text, View } from "react-native";
import SectionTitle from "../../ui/SectionTitle";

type CoachPlansSectionProps = {
  children: ReactNode;
};

export default function CoachPlansSection({
  children,
}: CoachPlansSectionProps) {
  return (
    <View className="mb-6 px-5">
      <SectionTitle>Plans</SectionTitle>
      <Text className="mt-2 text-sm leading-5 text-neutral-300">
        Keep training and nutrition aligned from one place.
      </Text>
      <View className="mt-4 gap-3">{children}</View>
    </View>
  );
}
