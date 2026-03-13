import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ProfileMenuSheetProps = {
  mounted: boolean;
  backdropStyle: StyleProp<ViewStyle>;
  panelStyle: StyleProp<ViewStyle>;
  pendingFollowRequestsCount: number;
  signingOut: boolean;
  onClose: () => void;
  onOpenCloseFriends: () => void;
  onOpenSettings: () => void;
  onOpenFollowRequests: () => void;
  onOpenUpgradePlan: () => void;
  onSignOut: () => void;
};

export default function ProfileMenuSheet({
  mounted,
  backdropStyle,
  panelStyle,
  pendingFollowRequestsCount,
  signingOut,
  onClose,
  onOpenCloseFriends,
  onOpenSettings,
  onOpenFollowRequests,
  onOpenUpgradePlan,
  onSignOut,
}: ProfileMenuSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const panelTopOffset = Math.max(insets.top, 10) + 6;
  const panelBottomPadding = Math.max(insets.bottom, 16);
  const panelWidth = Math.min(440, Math.max(320, screenWidth - 12));
  const panelHeight = Math.max(360, screenHeight - panelTopOffset);

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
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
              top: panelTopOffset,
              right: 0,
              bottom: 0,
              width: panelWidth,
              minHeight: panelHeight,
              borderTopLeftRadius: 30,
              borderBottomLeftRadius: 30,
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              borderWidth: StyleSheet.hairlineWidth,
              borderLeftColor: "#262626",
              borderTopColor: "#262626",
              borderRightColor: "transparent",
              borderBottomColor: "#262626",
              backgroundColor: "#09090b",
              overflow: "hidden",
              shadowColor: "#000000",
              shadowOffset: { width: -6, height: 0 },
              shadowOpacity: 0.28,
              shadowRadius: 24,
              elevation: 16,
            },
            panelStyle,
          ]}
        >
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 12,
              paddingBottom: panelBottomPadding + 8,
              minHeight: panelHeight,
            }}
          >
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
                onPress={onOpenCloseFriends}
                className="flex-row items-center justify-between px-5 py-4"
                testID="profile-close-friends-row"
              >
                <Text className="text-base font-medium text-white">Close Friends</Text>
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
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
