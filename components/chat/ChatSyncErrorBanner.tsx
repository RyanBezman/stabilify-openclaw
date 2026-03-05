import { Text, TouchableOpacity, View } from "react-native";

export default function ChatSyncErrorBanner({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  if (!error) return null;

  return (
    <View className="border-b border-neutral-900 bg-neutral-950 px-4 py-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-xs leading-relaxed text-rose-300" numberOfLines={2}>
          {error}
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onRetry}
          className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5"
        >
          <Text className="text-xs font-semibold text-neutral-200">Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

