import type { ReactNode } from "react";
import { Text, View } from "react-native";
import Card from "../../ui/Card";
import SectionTitle from "../../ui/SectionTitle";

type CoachPlansSectionProps = {
  children: ReactNode;
};

export default function CoachPlansSection({
  children,
}: CoachPlansSectionProps) {
  return (
    <Card className="mb-6 p-5">
      <SectionTitle>Plans</SectionTitle>
      <Text className="mt-2 text-sm leading-5 text-neutral-300">
        Keep training and nutrition aligned from one place.
      </Text>
      <View className="mt-4 flex-row gap-3">{children}</View>
    </Card>
  );
}
