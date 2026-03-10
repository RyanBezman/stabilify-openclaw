import type { ReactNode } from "react";
import { View } from "react-native";
import SectionTitle from "../../ui/SectionTitle";

type CoachPlansSectionProps = {
  children: ReactNode;
  title?: string;
};

export default function CoachPlansSection({
  children,
  title = "Plans",
}: CoachPlansSectionProps) {
  return (
    <View className="mb-6 px-5">
      <SectionTitle>{title}</SectionTitle>
      <View className="mt-4 gap-3">{children}</View>
    </View>
  );
}
