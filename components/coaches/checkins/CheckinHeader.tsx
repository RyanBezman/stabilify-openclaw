import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

type CheckinHeaderProps = {
  onBack: () => void;
  title: string;
  subtitle?: string | null;
};

export default function CheckinHeader({ onBack, title, subtitle }: CheckinHeaderProps) {
  return (
    <View className="border-b border-neutral-900/70 px-5 pb-4 pt-3">
      <View className="flex-row items-center">
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.85}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          className="h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/70"
        >
          <Ionicons name="chevron-back" size={22} color="#e5e5e5" />
        </TouchableOpacity>

        <View className="mx-3 flex-1 items-center">
          <Text className="text-[17px] font-bold text-white">{title}</Text>
          {subtitle ? (
            <Text className="mt-1 text-xs font-medium text-neutral-400">{subtitle}</Text>
          ) : null}
        </View>

        <View className="h-10 w-10" />
      </View>
    </View>
  );
}
