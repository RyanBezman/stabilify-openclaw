import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type ProfileMenuSheetProps = {
  mounted: boolean;
  topInset: number;
  bottomInset: number;
  backdropStyle: StyleProp<ViewStyle>;
  panelStyle: StyleProp<ViewStyle>;
  pendingFollowRequestsCount: number;
  signingOut: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenFollowRequests: () => void;
  onOpenUpgradePlan: () => void;
  onSignOut: () => void;
};

export default function ProfileMenuSheet({
  mounted,
  topInset,
  bottomInset,
  backdropStyle,
  panelStyle,
  pendingFollowRequestsCount,
  signingOut,
  onClose,
  onOpenSettings,
  onOpenFollowRequests,
  onOpenUpgradePlan,
  onSignOut,
}: ProfileMenuSheetProps) {
  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1">
        <Pressable className="absolute inset-0" onPress={onClose}>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "#000000" },
              backdropStyle,
            ]}
          />
        </Pressable>

        <Animated.View
          style={[
            {
              position: "absolute",
              top: topInset,
              right: 0,
              bottom: bottomInset,
              borderLeftWidth: StyleSheet.hairlineWidth,
              borderLeftColor: "#262626",
              backgroundColor: "#0a0a0a",
            },
            panelStyle,
          ]}
        >
          <View className="flex-1">
            <View className="flex-row items-center justify-between px-5 pb-4 pt-3">
              <Text className="text-3xl font-bold tracking-tight text-white">Menu</Text>
              <TouchableOpacity
                onPress={onClose}
                className="h-10 w-10 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900"
                accessibilityRole="button"
                accessibilityLabel="Close profile menu"
              >
                <Ionicons name="close" size={18} color="#e5e5e5" />
              </TouchableOpacity>
            </View>

            <View className="border-y border-neutral-800">
              <TouchableOpacity
                onPress={onOpenSettings}
                className="flex-row items-center justify-between px-5 py-4"
                testID="profile-settings-row"
              >
                <Text className="text-base font-medium text-white">Settings</Text>
                <Ionicons name="chevron-forward" size={16} color="#737373" />
              </TouchableOpacity>

              <View className="h-px bg-neutral-800" />

              <TouchableOpacity
                onPress={onOpenFollowRequests}
                className="flex-row items-center justify-between px-5 py-4"
                testID="profile-follow-requests-row"
              >
                <View className="flex-row items-center">
                  <Text className="text-base font-medium text-white">Notifications</Text>
                  {pendingFollowRequestsCount > 0 ? (
                    <View className="ml-2 rounded-full border border-violet-400/40 bg-violet-500/20 px-2 py-0.5">
                      <Text className="text-[10px] font-semibold text-violet-100">
                        {pendingFollowRequestsCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#737373" />
              </TouchableOpacity>

              <View className="h-px bg-neutral-800" />

              <TouchableOpacity
                onPress={onOpenUpgradePlan}
                className="flex-row items-center justify-between px-5 py-4"
                testID="profile-upgrade-row"
              >
                <Text className="text-base font-medium text-white">Upgrade Plan</Text>
                <Ionicons name="chevron-forward" size={16} color="#737373" />
              </TouchableOpacity>

              <View className="h-px bg-neutral-800" />

              <TouchableOpacity
                onPress={onSignOut}
                className="flex-row items-center justify-between px-5 py-4"
                testID="profile-signout-row"
                disabled={signingOut}
              >
                <Text className="text-base font-medium text-rose-400">
                  {signingOut ? "Signing out..." : "Sign out"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
