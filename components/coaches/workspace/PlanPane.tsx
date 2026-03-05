import type { ReactNode } from "react";
import { ScrollView } from "react-native";

type PlanPaneProps = {
  children: ReactNode;
};

export default function PlanPane({ children }: PlanPaneProps) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-5 pb-32 pt-5"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
