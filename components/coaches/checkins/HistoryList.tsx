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
    <View className="mt-2">
      <View className="mb-3 px-1">
        <Text className="text-[11px] font-semibold uppercase tracking-[1.3px] text-neutral-500">
          History
        </Text>
        <Text className="mt-1 text-sm text-neutral-400">Past weekly check-ins</Text>
      </View>

      {empty ? (
        <View className="rounded-2xl border border-neutral-800 bg-neutral-950 px-5 py-5">
          <Text className="text-sm text-neutral-400">No past weekly check-ins yet.</Text>
        </View>
      ) : (
        <View className="gap-3">{children}</View>
      )}
    </View>
  );
}
