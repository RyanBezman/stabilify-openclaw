import type { ReactNode } from "react";
import { Text, View } from "react-native";

type HistoryListProps = {
  empty: boolean;
  children: ReactNode;
};

export default function HistoryList({
  empty,
  children,
}: HistoryListProps) {
  return (
    <View className="-mx-5 mt-6 border-y border-violet-700 bg-black">
      <View className="bg-violet-900 px-5 py-4">
        <View>
          <Text className="text-base font-bold text-white">History</Text>
          <Text className="mt-1 text-sm text-violet-100">Past weekly check-ins</Text>
        </View>
      </View>

      {empty ? (
        <View className="border-t border-violet-500/20 px-5 py-5">
          <Text className="text-sm text-neutral-400">No past weekly check-ins yet.</Text>
        </View>
      ) : (
        <View className="border-t border-violet-500/20 bg-black pb-4">{children}</View>
      )}
    </View>
  );
}
