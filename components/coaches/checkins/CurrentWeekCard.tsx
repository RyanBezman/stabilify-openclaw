import type { ReactNode } from "react";
import { Text, View } from "react-native";

type CurrentWeekCardProps = {
  title?: string;
  helper?: string | null;
  children: ReactNode;
};

export default function CurrentWeekCard({
  title = "This week",
  helper = null,
  children,
}: CurrentWeekCardProps) {
  return (
    <View className="mb-8">
      <View className="mb-3 px-1">
        <Text className="text-[11px] font-semibold uppercase tracking-[1.3px] text-neutral-500">
          {title}
        </Text>
        {helper ? <Text className="mt-1 text-sm text-neutral-400">{helper}</Text> : null}
      </View>
      {children}
    </View>
  );
}
