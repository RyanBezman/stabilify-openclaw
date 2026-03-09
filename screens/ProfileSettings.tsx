import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HelperText from "../components/ui/HelperText";
import OptionPill from "../components/ui/OptionPill";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import { useProfileSettings } from "../lib/features/profile-settings";
import { fetchHasActivePushNotificationDevice } from "../lib/data/supportAutomation";
import {
  getProfilePhotoSignedUrl,
  useOwnProfilePhotoActions,
  useProfilePhotoActionHandlers,
} from "../lib/features/profile";
import {
  profileSettingsEditableFields,
  type EditableProfileSettingsFieldKey,
} from "../lib/features/profile-settings/editableFields";
import type { RootStackParamList } from "../lib/navigation/types";
import { getExpoProjectId } from "../lib/utils/expo";
import AppScreen from "../components/ui/AppScreen";

type ProfileSettingsProps = NativeStackScreenProps<RootStackParamList, "ProfileSettings">;

type SettingsToggleRowProps = {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  isLast?: boolean;
};

type SettingsLinkRowProps = {
  title: string;
  description?: string;
  value?: string;
  onPress: () => void;
  isLast?: boolean;
};

function isPhoneNudgesPermissionError(message?: string) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes("notification permission is required");
}

function SettingsToggleRow({
  title,
  description,
  value,
  onValueChange,
  disabled,
  isLast = false,
}: SettingsToggleRowProps) {
  return (
    <View className={`flex-row items-center px-5 py-4 ${isLast ? "" : "border-b border-neutral-900"}`}>
      <View className="mr-4 flex-1">
        <Text className="text-[16px] text-white">{title}</Text>
        {description ? <HelperText className="mt-1">{description}</HelperText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#262626", true: "#7c3aed" }}
        thumbColor="#f5f3ff"
        disabled={disabled}
      />
    </View>
  );
}

function SettingsLinkRow({
  title,
  description,
  value,
  onPress,
  isLast = false,
}: SettingsLinkRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`flex-row items-center px-5 py-4 ${isLast ? "" : "border-b border-neutral-900"}`}
    >
      <View className="mr-4 flex-1">
        <Text className="text-[16px] text-white">{title}</Text>
        {description ? <HelperText className="mt-1">{description}</HelperText> : null}
      </View>
      {value ? <Text className="mr-3 text-[16px] text-neutral-400">{value}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color="#737373" />
    </TouchableOpacity>
  );
}

type SettingsEditableFieldRowProps = {
  label: string;
  value: string;
  usesPlaceholder?: boolean;
  onPress: () => void;
  disabled?: boolean;
  isLast?: boolean;
};

function SettingsEditableFieldRow({
  label,
  value,
  usesPlaceholder = false,
  onPress,
  disabled = false,
  isLast = false,
}: SettingsEditableFieldRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      className={`flex-row items-start px-5 py-4 ${isLast ? "" : "border-b border-neutral-900"} ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <View className="w-28 pr-4">
        <Text className="text-[16px] text-neutral-200">{label}</Text>
      </View>
      <View className="flex-1 pr-3">
        <Text
          numberOfLines={label === "Bio" ? 3 : 2}
          className={`text-[16px] ${usesPlaceholder ? "text-neutral-500" : "text-white"}`}
        >
          {value}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#737373" />
    </TouchableOpacity>
  );
}

export default function ProfileSettings({ navigation }: ProfileSettingsProps) {
  const insets = useSafeAreaInsets();
  const {
    loading,
    saving,
    updatingPhoneNudges,
    updatingAppleHealthSteps,
    grantingAutoSupportConsent,
    loadError,
    refresh,
    displayName,
    username,
    bio,
    avatarPath,
    preferredUnit,
    timezone,
    accountVisibility,
    progressVisibility,
    socialEnabled,
    weighInShareVisibility,
    gymEventShareVisibility,
    postShareVisibility,
    autoSupportEnabled,
    autoSupportConsentedAt,
    setAutoSupportEnabled,
    phoneNudgesEnabled,
    setPhoneNudgesEnabled,
    appleHealthStepsEnabled,
    setAppleHealthStepsEnabled,
    dailyStepGoal,
    grantAutoSupportConsent,
    updateProfileValues,
  } = useProfileSettings();
  const [showAdvancedPrivacy, setShowAdvancedPrivacy] = useState(false);
  const [sendingTestNotification, setSendingTestNotification] = useState(false);
  const [sendingDelayedTestNotification, setSendingDelayedTestNotification] = useState(false);
  const [loadingPushDebugInfo, setLoadingPushDebugInfo] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const refreshProfileSettingsSurface = useCallback(async () => {
    const result = await refresh();
    return result.error ? { error: result.error } : {};
  }, [refresh]);

  const { photoLoading, uploadPhoto, removePhoto } = useOwnProfilePhotoActions({
    refreshProfile: refreshProfileSettingsSurface,
  });
  const { openPhotoActions } = useProfilePhotoActionHandlers({
    photoUrl,
    photoLoading,
    uploadPhoto,
    removePhoto,
  });

  useEffect(() => {
    if (!loadError) return;
    Alert.alert("Couldn't load profile settings", loadError);
  }, [loadError]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    let active = true;

    const loadPhotoUrl = async () => {
      if (!avatarPath) {
        if (active) {
          setPhotoUrl(null);
        }
        return;
      }

      const result = await getProfilePhotoSignedUrl(avatarPath);
      if (!active) {
        return;
      }

      setPhotoUrl(result.data?.signedUrl ?? null);
    };

    void loadPhotoUrl();

    return () => {
      active = false;
    };
  }, [avatarPath]);

  const editableFieldValues = {
    displayName,
    username,
    bio,
    avatarPath,
    preferredUnit,
    timezone,
    accountVisibility,
    progressVisibility,
    socialEnabled,
    weighInShareVisibility,
    gymEventShareVisibility,
    postShareVisibility,
    autoSupportEnabled,
    autoSupportConsentedAt,
    appleHealthStepsEnabled,
    dailyStepGoal,
  };

  const renderEditableFieldRow = (
    fieldKey: EditableProfileSettingsFieldKey,
    isLast = false,
  ) => {
    const field = profileSettingsEditableFields[fieldKey];
    const preview = field.getPreview(editableFieldValues);

    return (
      <SettingsEditableFieldRow
        key={fieldKey}
        label={field.label}
        value={preview.value}
        usesPlaceholder={preview.usesPlaceholder}
        disabled={loading || saving}
        onPress={() => {
          navigation.navigate("ProfileSettingsTextEdit", { fieldKey });
        }}
        isLast={isLast}
      />
    );
  };

  const handleImmediateSaveError = (title: string, message?: string) => {
    if (!message) {
      return;
    }
    Alert.alert(title, message);
  };

  const handleAccountVisibilityChange = async (next: "private" | "public") => {
    const nextValues =
      next === "public"
        ? {
            accountVisibility: next,
            socialEnabled: true,
            weighInShareVisibility: "followers" as const,
            gymEventShareVisibility: "followers" as const,
            postShareVisibility: "followers" as const,
          }
        : {
            accountVisibility: next,
            socialEnabled: false,
            weighInShareVisibility: "private" as const,
            gymEventShareVisibility: "private" as const,
            postShareVisibility: "private" as const,
          };

    if (next === "private") {
      setShowAdvancedPrivacy(false);
    }

    const result = await updateProfileValues(nextValues);
    handleImmediateSaveError("Couldn't update profile visibility", result.error);
  };

  const handleSocialEnabledToggle = async (enabled: boolean) => {
    const result = await updateProfileValues({ socialEnabled: enabled });
    handleImmediateSaveError("Couldn't update social features", result.error);
  };

  const handleWeighInShareToggle = async (enabled: boolean) => {
    const result = await updateProfileValues({
      weighInShareVisibility: enabled ? "followers" : "private",
    });
    handleImmediateSaveError("Couldn't update weigh-in sharing", result.error);
  };

  const handleGymEventShareToggle = async (enabled: boolean) => {
    const result = await updateProfileValues({
      gymEventShareVisibility: enabled ? "followers" : "private",
    });
    handleImmediateSaveError("Couldn't update gym sharing", result.error);
  };

  const handlePostShareToggle = async (enabled: boolean) => {
    const result = await updateProfileValues({
      postShareVisibility: enabled ? "followers" : "private",
    });
    handleImmediateSaveError("Couldn't update post sharing", result.error);
  };

  const handleProgressVisibilityToggle = async (enabled: boolean) => {
    const result = await updateProfileValues({
      progressVisibility: enabled ? "public" : "private",
    });
    handleImmediateSaveError("Couldn't update progress visibility", result.error);
  };

  const handlePreferredUnitChange = async (nextUnit: "lb" | "kg") => {
    const result = await updateProfileValues({ preferredUnit: nextUnit });
    handleImmediateSaveError("Couldn't update preferred unit", result.error);
  };

  const handleSetPhoneNudgesEnabled = async (enabled: boolean) => {
    const result = await setPhoneNudgesEnabled(enabled);
    if (result.success || !result.error) {
      return;
    }

    if (enabled && isPhoneNudgesPermissionError(result.error)) {
      Alert.alert(
        "Enable notifications in Settings",
        "To turn on phone notifications, allow notifications for Stabilify in your device settings.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              void Linking.openSettings();
            },
          },
        ],
      );
    }
  };

  const handleGrantAutoSupportConsent = async (): Promise<boolean> => {
    const result = await grantAutoSupportConsent();
    if (!result.success && result.error) {
      Alert.alert("Couldn't save consent", result.error);
      return false;
    }
    if (!result.success) {
      return false;
    }

    Alert.alert(
      "Consent saved",
      "Future behind-goal triggers can auto-post to close friends. This week remains unchanged.",
    );
    return true;
  };

  const handleAppleHealthStepsToggle = async (enabled: boolean) => {
    const result = await setAppleHealthStepsEnabled(enabled);
    if (result.success || !result.error) {
      return;
    }

    Alert.alert(
      "Couldn't update Apple Health",
      result.error,
      [
        { text: "OK", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            void Linking.openSettings();
          },
        },
      ],
    );
  };

  const handleAutoSupportToggle = (enabled: boolean) => {
    if (!enabled) {
      void (async () => {
        const result = await updateProfileValues({ autoSupportEnabled: false });
        handleImmediateSaveError("Couldn't disable auto support", result.error);
      })();
      return;
    }

    setAutoSupportEnabled(true);
    Alert.alert(
      "Allow auto-support?",
      "When you are behind, Stabilify can automatically publish a private close-friends support post. No weight details are shared.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            setAutoSupportEnabled(false);
          },
        },
        {
          text: "I agree",
          onPress: () => {
            void (async () => {
              const consentSaved = await handleGrantAutoSupportConsent();
              if (!consentSaved) {
                setAutoSupportEnabled(false);
              }
            })();
          },
        },
      ],
    );
  };

  const ensureNotificationPermission = async () => {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
      });
    }

    const existingPermission = await Notifications.getPermissionsAsync();
    let notificationStatus = existingPermission.status;
    if (notificationStatus !== "granted") {
      const requestedPermission = await Notifications.requestPermissionsAsync();
      notificationStatus = requestedPermission.status;
    }

    return notificationStatus;
  };

  const handleSendTestNotification = async () => {
    if (sendingTestNotification) {
      return;
    }

    setSendingTestNotification(true);
    try {
      const notificationStatus = await ensureNotificationPermission();

      if (notificationStatus !== "granted") {
        Alert.alert(
          "Notifications not enabled",
          "Allow notifications for Stabilify to test them from this screen.",
        );
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Stabilify test notification",
          body: "Notifications are working in this dev build.",
          sound: "default",
        },
        trigger: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Couldn't schedule a local test notification.";
      Alert.alert("Test notification failed", message);
    } finally {
      setSendingTestNotification(false);
    }
  };

  const handleSendDelayedTestNotification = async () => {
    if (sendingDelayedTestNotification) {
      return;
    }

    setSendingDelayedTestNotification(true);
    try {
      const notificationStatus = await ensureNotificationPermission();
      if (notificationStatus !== "granted") {
        Alert.alert(
          "Notifications not enabled",
          "Allow notifications for Stabilify to test them from this screen.",
        );
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Stabilify delayed test",
          body: "This notification was scheduled 5 seconds ago.",
          sound: "default",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(Date.now() + 5000),
        },
      });

      Alert.alert("Scheduled", "A test notification will fire in 5 seconds.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Couldn't schedule a delayed test notification.";
      Alert.alert("Delayed test failed", message);
    } finally {
      setSendingDelayedTestNotification(false);
    }
  };

  const handleShowPushDebugInfo = async () => {
    if (loadingPushDebugInfo) {
      return;
    }

    setLoadingPushDebugInfo(true);
    try {
      const permission = await Notifications.getPermissionsAsync();
      const projectId = getExpoProjectId();
      const registrationResult = await fetchHasActivePushNotificationDevice();
      let tokenDetails = "Not requested";

      if (permission.status === "granted") {
        try {
          const tokenResult = projectId
            ? await Notifications.getExpoPushTokenAsync({ projectId })
            : await Notifications.getExpoPushTokenAsync();
          tokenDetails = tokenResult.data?.trim() || "Missing token";
        } catch (error) {
          tokenDetails =
            error instanceof Error ? `Error: ${error.message}` : "Error reading Expo token";
        }
      }

      Alert.alert(
        "Push debug info",
        [
          `Permission: ${permission.status}`,
          `Project ID: ${projectId ?? "Missing"}`,
          `Server registered: ${
            registrationResult.error
              ? `Error: ${registrationResult.error}`
              : registrationResult.data?.hasActiveDevice
                ? "Yes"
                : "No"
          }`,
          `Expo token: ${tokenDetails}`,
        ].join("\n"),
      );
    } finally {
      setLoadingPushDebugInfo(false);
    }
  };

  return (
    <AppScreen className="flex-1 bg-neutral-950" maxContentWidth={720}>
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-10 pt-2"
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 24 }}
          automaticallyAdjustContentInsets={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        >
          <View>
              <View className="px-5 pb-5 pt-4">
                <View className="relative items-center justify-center py-2">
                  <TouchableOpacity
                    onPress={navigation.goBack}
                    className="absolute left-0 top-0 h-11 w-11 items-center justify-center rounded-full"
                    activeOpacity={0.75}
                  >
                    <Ionicons name="chevron-back" size={28} color="#fafafa" />
                  </TouchableOpacity>
                  <Text className="text-[22px] font-semibold text-white">Edit profile</Text>
                </View>
              </View>

              <View className="items-center border-y border-neutral-900 px-5 py-8">
                <TouchableOpacity
                  onPress={openPhotoActions}
                  activeOpacity={0.85}
                  disabled={photoLoading}
                  className="items-center"
                >
                  <ProfileAvatar
                    displayName={displayName}
                    photoUrl={photoUrl}
                    size={96}
                    className="border-neutral-800 bg-neutral-900"
                  />
                  <Text className="mt-4 text-sm font-medium text-violet-300">
                    {photoLoading ? "Updating picture..." : "Edit picture"}
                  </Text>
                </TouchableOpacity>
                <Text className="mt-4 text-lg font-medium text-white">
                  {displayName || "Your profile"}
                </Text>
                <Text className="mt-2 text-sm text-neutral-500">
                  Tap a text field to edit it. Preference changes still save automatically.
                </Text>
              </View>

              <View className="mt-6 border-y border-neutral-900 bg-black">
                {renderEditableFieldRow("displayName")}
                {renderEditableFieldRow("username")}
                {renderEditableFieldRow("bio")}
                <View className="border-b border-neutral-900 px-5 py-4">
                  <View className="flex-row">
                    <View className="w-28 pr-4">
                      <Text className="text-[16px] text-neutral-200">Unit</Text>
                    </View>
                    <View className="flex-1 flex-row flex-wrap gap-2">
                      <OptionPill
                        label="Pounds (lb)"
                        selected={preferredUnit === "lb"}
                        disabled={loading || saving}
                        onPress={() => {
                          void handlePreferredUnitChange("lb");
                        }}
                      />
                      <OptionPill
                        label="Kilograms (kg)"
                        selected={preferredUnit === "kg"}
                        disabled={loading || saving}
                        onPress={() => {
                          void handlePreferredUnitChange("kg");
                        }}
                      />
                    </View>
                  </View>
                </View>
                {renderEditableFieldRow("timezone")}
                {renderEditableFieldRow("dailyStepGoal", true)}
              </View>

              <Text className="px-5 pb-2 pt-8 text-xs font-semibold uppercase tracking-[1.8px] text-neutral-500">
                Privacy
              </Text>
              <View className="border-y border-neutral-900 bg-black">
                <View className="border-b border-neutral-900 px-5 py-4">
                  <View className="flex-row">
                    <View className="w-28 pr-4">
                      <Text className="text-[16px] text-neutral-200">Profile</Text>
                    </View>
                    <View className="flex-1">
                      <View className="flex-row flex-wrap gap-2">
                        <OptionPill
                          label="Private"
                          selected={accountVisibility === "private"}
                          disabled={loading || saving}
                          onPress={() => {
                            void handleAccountVisibilityChange("private");
                          }}
                        />
                        <OptionPill
                          label="Public"
                          selected={accountVisibility === "public"}
                          disabled={loading || saving}
                          onPress={() => {
                            void handleAccountVisibilityChange("public");
                          }}
                        />
                      </View>
                      <HelperText className="mt-2">
                        Public makes your profile visible and defaults sharing to followers.
                      </HelperText>
                    </View>
                  </View>
                </View>
                <SettingsToggleRow
                  title="Show Progress on public profile"
                  description="Turn off to hide your Progress tab from other users."
                  value={progressVisibility === "public"}
                  onValueChange={handleProgressVisibilityToggle}
                  disabled={loading || saving}
                />
                {accountVisibility === "public" ? (
                  <TouchableOpacity
                    onPress={() => setShowAdvancedPrivacy((value) => !value)}
                    activeOpacity={0.8}
                    className="border-b border-neutral-900 px-5 py-4"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="mr-4 flex-1">
                        <Text className="text-[16px] text-white">Advanced privacy</Text>
                        <HelperText className="mt-1">
                          Fine-tune social defaults for posts, gym events, and weigh-ins.
                        </HelperText>
                      </View>
                      <Ionicons
                        name={showAdvancedPrivacy ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#737373"
                      />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View className="border-b border-neutral-900 px-5 py-4">
                    <Text className="text-[16px] text-white">Advanced privacy</Text>
                    <HelperText className="mt-1">
                      Available once your profile is public.
                    </HelperText>
                  </View>
                )}

                {accountVisibility === "public" && showAdvancedPrivacy ? (
                  <>
                    <SettingsToggleRow
                      title="Social features"
                      description="Enable social surfaces and sharing defaults."
                      value={socialEnabled}
                      onValueChange={(value) => {
                        void handleSocialEnabledToggle(value);
                      }}
                      disabled={loading || saving}
                    />
                    <SettingsToggleRow
                      title="Share weigh-ins by default"
                      description="Off keeps weigh-ins private by default."
                      value={weighInShareVisibility !== "private"}
                      onValueChange={handleWeighInShareToggle}
                    />
                    <SettingsToggleRow
                      title="Share gym events by default"
                      description="Off keeps gym events private by default."
                      value={gymEventShareVisibility !== "private"}
                      onValueChange={handleGymEventShareToggle}
                    />
                    <SettingsToggleRow
                      title="Share posts by default"
                      description="Off keeps posts private by default."
                      value={postShareVisibility !== "private"}
                      onValueChange={handlePostShareToggle}
                      isLast
                    />
                  </>
                ) : null}
              </View>

              <Text className="px-5 pb-2 pt-8 text-xs font-semibold uppercase tracking-[1.8px] text-neutral-500">
                Support
              </Text>
              <View className="border-y border-neutral-900 bg-black">
                <SettingsToggleRow
                  title="Auto support post"
                  description="Allow close-friends support posts when you are behind this week."
                  value={autoSupportEnabled}
                  onValueChange={handleAutoSupportToggle}
                  disabled={loading || saving || grantingAutoSupportConsent}
                />
                <SettingsToggleRow
                  title="Phone notifications"
                  description="Turn on to receive private behind-goal reminders on this device."
                  value={phoneNudgesEnabled}
                  onValueChange={(value) => {
                    void handleSetPhoneNudgesEnabled(value);
                  }}
                  disabled={loading || saving || updatingPhoneNudges}
                />
                <SettingsToggleRow
                  title="Track steps"
                  description={
                    Platform.OS === "ios"
                      ? "Sync today's steps from Apple Health into your Home progress card."
                      : "Apple Health sync is available on iPhone only."
                  }
                  value={appleHealthStepsEnabled}
                  onValueChange={(value) => {
                    void handleAppleHealthStepsToggle(value);
                  }}
                  disabled={loading || saving || updatingAppleHealthSteps || Platform.OS !== "ios"}
                  isLast
                />
              </View>

              <Text className="px-5 pb-2 pt-8 text-xs font-semibold uppercase tracking-[1.8px] text-neutral-500">
                Verification
              </Text>
              <View className="border-y border-neutral-900 bg-black">
                <SettingsLinkRow
                  title="Gym verification location"
                  description="Update your saved gym to control gym session verification."
                  onPress={() => navigation.navigate("GymSettings")}
                  isLast
                />
              </View>

              {__DEV__ ? (
                <Card className="mx-5 mb-6 mt-8 p-5">
                  <Text className="text-sm font-semibold text-white">Developer tools</Text>
                  <HelperText className="mt-1">
                    Send a local notification from this screen to verify notification presentation in the dev build.
                  </HelperText>
                  <View className="mt-4">
                    <Button
                      title={sendingTestNotification ? "Sending test notification..." : "Send test notification"}
                      loading={sendingTestNotification}
                      disabled={sendingTestNotification}
                      onPress={() => {
                        void handleSendTestNotification();
                      }}
                    />
                  </View>
                  <View className="mt-3">
                    <Button
                      title={
                        sendingDelayedTestNotification
                          ? "Scheduling delayed notification..."
                          : "Send delayed notification (5s)"
                      }
                      loading={sendingDelayedTestNotification}
                      disabled={sendingDelayedTestNotification}
                      onPress={() => {
                        void handleSendDelayedTestNotification();
                      }}
                    />
                  </View>
                  <View className="mt-3">
                    <Button
                      title={loadingPushDebugInfo ? "Loading push info..." : "Show push registration info"}
                      loading={loadingPushDebugInfo}
                      disabled={loadingPushDebugInfo}
                      onPress={() => {
                        void handleShowPushDebugInfo();
                      }}
                    />
                  </View>
                </Card>
              ) : null}
          </View>
        </ScrollView>
      </View>
    </AppScreen>
  );
}
