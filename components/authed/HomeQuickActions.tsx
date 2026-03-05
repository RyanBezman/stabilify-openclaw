import { Text, TouchableOpacity, View } from "react-native";

type HomeQuickActionsProps = {
  onPressWeighIn: () => void;
  onPressGymProof: () => void;
  onPressTrend: () => void;
};

export default function HomeQuickActions({
  onPressWeighIn,
  onPressGymProof,
  onPressTrend,
}: HomeQuickActionsProps) {
  return (
    <View className="mb-8 flex-row gap-3">
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressWeighIn}
        className="flex-1 items-center rounded-2xl border border-neutral-800 bg-neutral-900 py-5"
      >
        <Text className="mb-1 text-xl">⚖️</Text>
        <Text className="text-sm font-semibold text-neutral-300">Weigh-in</Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressGymProof}
        className="flex-1 items-center rounded-2xl border border-neutral-800 bg-neutral-900 py-5"
      >
        <Text className="mb-1 text-xl">🎯</Text>
        <Text className="text-sm font-semibold text-neutral-300">Gym proof</Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPressTrend}
        className="flex-1 items-center rounded-2xl border border-neutral-800 bg-neutral-900 py-5"
      >
        <Text className="mb-1 text-xl">📈</Text>
        <Text className="text-sm font-semibold text-neutral-300">Trend</Text>
      </TouchableOpacity>
    </View>
  );
}
