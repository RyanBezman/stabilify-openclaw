import { Text, TouchableOpacity, View } from "react-native";

type GuestCtaRowProps = {
  label: string;
  onPress: () => void;
};

export default function GuestCtaRow({ label, onPress }: GuestCtaRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="mb-7 flex-row items-center rounded-2xl border border-neutral-800 bg-neutral-900 px-5 py-4"
    >
      <View className="mr-4 h-3 w-3 rounded-full bg-violet-500" />
      <Text className="flex-1 text-base text-neutral-300">{label}</Text>
      <Text className="text-lg text-violet-400">→</Text>
    </TouchableOpacity>
  );
}
