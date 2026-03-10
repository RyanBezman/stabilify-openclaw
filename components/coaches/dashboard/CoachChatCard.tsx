import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import SectionTitle from "../../ui/SectionTitle";

export default function CoachChatCard({
  coachName,
  onPress,
}: {
  coachName: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} className="mb-6 px-5">
      <View className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 px-5 py-6">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <SectionTitle className="text-neutral-400">Coach Hub</SectionTitle>
            <Text className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {coachName}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-neutral-300">
              Ask questions, tune your plan, and close the week with clear next steps.
            </Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-full border border-neutral-700 bg-neutral-950/50">
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={20}
              color="#d4d4d4"
            />
          </View>
        </View>

        <View className="mt-5 flex-row items-center justify-between border-t border-neutral-800 pt-4">
          <Text className="text-sm font-semibold text-violet-300">Open coach chat</Text>
          <Ionicons name="chevron-forward" size={16} color="#a78bfa" />
        </View>
      </View>
    </TouchableOpacity>
  );
}
