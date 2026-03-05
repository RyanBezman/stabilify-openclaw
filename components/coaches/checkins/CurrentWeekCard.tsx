import type { ReactNode } from "react";
import { Text, View } from "react-native";

type CurrentWeekCardProps = {
  title?: string;
  children: ReactNode;
};

export default function CurrentWeekCard({ title = "This week", children }: CurrentWeekCardProps) {
  return (
    <>
      <View className="mb-3">
        <Text className="text-base font-bold text-white">{title}</Text>
      </View>
      {children}
    </>
  );
}
