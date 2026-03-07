import { Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type AuthedHeaderProps = {
  onOpenNotifications: () => void;
  notificationCount?: number;
};

export default function AuthedHeader({
  onOpenNotifications,
  notificationCount = 0,
}: AuthedHeaderProps) {
  return (
    <View className="mb-6 flex-row items-center justify-between">
      <View className="min-w-0 flex-1">
        <View className="flex-row items-end gap-2.5">
          <Image
            source={require("../../assets/scale-logo.png")}
            style={{ width: 36, height: 36 }}
            resizeMode="contain"
            accessibilityLabel="Stabilify app icon"
          />
          <View className="h-8 justify-end">
            <Text
              className="text-3xl font-bold tracking-tight text-white"
              style={{ lineHeight: 30, includeFontPadding: false, marginBottom: -2 }}
            >
              Stabilify
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        onPress={onOpenNotifications}
        activeOpacity={0.8}
        className="mt-0.5 h-9 w-9 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900"
        accessibilityRole="button"
        accessibilityLabel="Open notifications"
      >
        <Ionicons name="notifications-outline" size={17} color="#e5e5e5" />
        {notificationCount > 0 ? (
          <View className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-500 px-1 py-0.5">
            <Text className="text-center text-[10px] font-semibold text-white">
              {notificationCount > 99 ? "99+" : String(notificationCount)}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}
