import type { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Card from "../../ui/Card";

type HistoryListProps = {
  refreshing: boolean;
  onRefresh: () => void;
  disabled?: boolean;
  empty: boolean;
  children: ReactNode;
};

export default function HistoryList({
  refreshing,
  onRefresh,
  disabled = false,
  empty,
  children,
}: HistoryListProps) {
  return (
    <>
      <View className="mb-3 mt-6 flex-row items-center justify-between">
        <Text className="text-base font-bold text-white">History</Text>
        <TouchableOpacity
          onPress={onRefresh}
          disabled={disabled}
          activeOpacity={0.85}
          className="rounded-full border border-neutral-800 px-3 py-1.5"
        >
          <Text className="text-xs font-semibold text-neutral-300">
            {refreshing ? "Refreshing..." : "Refresh"}
          </Text>
        </TouchableOpacity>
      </View>

      {empty ? (
        <Card className="p-5">
          <Text className="text-sm text-neutral-500">No past weekly check-ins yet.</Text>
        </Card>
      ) : (
        children
      )}
    </>
  );
}
