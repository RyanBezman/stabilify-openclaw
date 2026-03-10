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
    <>
      <View className="-mx-5 mb-3 border-y border-violet-700 bg-violet-900 px-5 py-4">
        <Text className="text-base font-bold text-white">{title}</Text>
        {helper ? <Text className="mt-1 text-sm text-violet-100">{helper}</Text> : null}
      </View>
      {children}
    </>
  );
}
