import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import Card from "../ui/Card";

type ProfileLockedStateProps = {
  title: string;
  message: string;
};

export default function ProfileLockedState({ title, message }: ProfileLockedStateProps) {
  return (
    <Card className="items-center border-neutral-800 bg-neutral-900/70 px-5 py-8">
      <View className="h-12 w-12 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900">
        <Ionicons name="lock-closed-outline" size={20} color="#d4d4d4" />
      </View>
      <Text className="mt-4 text-base font-semibold text-white">{title}</Text>
      <Text className="mt-1 text-center text-sm leading-relaxed text-neutral-400">{message}</Text>
    </Card>
  );
}
