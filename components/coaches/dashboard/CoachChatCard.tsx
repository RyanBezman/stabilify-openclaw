import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import Card from "../../ui/Card";
import SectionTitle from "../../ui/SectionTitle";

export default function CoachChatCard({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <Card className="mb-6 p-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <SectionTitle>Coach Chat</SectionTitle>
            <Text className="mt-2 text-sm text-neutral-300">
              Ask questions, adjust plans, and get guidance in one thread.
            </Text>
          </View>
          <View className="h-10 w-10 items-center justify-center rounded-full border border-violet-500/40 bg-violet-600/20">
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color="#ddd6fe"
            />
          </View>
        </View>

        <View className="mt-4 self-start rounded-full border border-violet-500/40 bg-violet-600/20 px-3 py-1">
          <Text className="text-xs font-semibold text-violet-200">
            Open chat
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}
