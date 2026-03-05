import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import CoachAvatar from "../CoachAvatar";
import type { ActiveCoach } from "../../../lib/features/coaches";
import type { WorkspaceTab } from "../../../lib/features/coaches";

type WorkspaceHeaderProps = {
  coach: ActiveCoach;
  title: string;
  tab: WorkspaceTab;
  showBack?: boolean;
  onBack?: () => void;
  onOpenActions?: () => void;
};

export default function WorkspaceHeader({
  coach,
  title,
  tab,
  showBack = false,
  onBack,
  onOpenActions,
}: WorkspaceHeaderProps) {
  return (
    <View className="border-b border-neutral-900 bg-neutral-950 px-5 pb-4 pt-4">
      <View className="flex-row items-center">
        {showBack ? (
          <TouchableOpacity
            onPress={() => onBack?.()}
            activeOpacity={0.85}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/60"
          >
            <Ionicons name="chevron-back" size={22} color="#e5e5e5" />
          </TouchableOpacity>
        ) : (
          <View className="h-10 w-10" />
        )}

        <View className="mx-3 flex-1 items-center">
          <View className="flex-row items-center gap-2">
            <CoachAvatar coach={coach} size={28} />
            <Text className="text-base font-bold text-white">{title}</Text>
          </View>
        </View>

        {tab === "plan" && onOpenActions ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onOpenActions}
            className="h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/60"
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#e5e5e5" />
          </TouchableOpacity>
        ) : (
          <View className="h-10 w-10" />
        )}
      </View>
    </View>
  );
}
