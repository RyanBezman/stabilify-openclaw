import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchHasActivePushNotificationDevice } from "../../data/supportAutomation";
import {
  getProfilePhotoSignedUrl,
  useOwnProfilePhotoActions,
  useProfilePhotoActionHandlers,
} from "../profile";
import { getExpoProjectId } from "../../utils/expo";
import type { RootStackParamList } from "../../navigation/types";
import {
  profileSettingsEditableFields,
  type EditableProfileSettingsFieldKey,
} from "./editableFields";
import { useProfileSettings } from "./useProfileSettings";

type ProfileSettingsNavigation = NativeStackNavigationProp<
  RootStackParamList,
  "ProfileSettings"
>;

type EditableFieldRow = {
  fieldKey: EditableProfileSettingsFieldKey;
  label: string;
  value: string;
  usesPlaceholder: boolean;
};

function isPhoneNudgesPermissionError(message?: string) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes("notification permission is required");
}

export function useProfileSettingsScreen(navigation: ProfileSettingsNavigation) {
  const settings = useProfileSettings();
  const [showAdvancedPrivacy, setShowAdvancedPrivacy] = useState(false);
  const [sendingTestNotification, setSendingTestNotification] = useState(false);
  const [sendingDelayedTestNotification, setSendingDelayedTestNotification] = useState(false);
  const [loadingPushDebugInfo, setLoadingPushDebugInfo] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const refreshProfileSettingsSurface = useCallback(async () => {
    const result = await settings.refresh({ blocking: false, preserveOnError: true });
    return result.error ? { error: result.error } : {};
  }, [settings]);

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
    if (!settings.loadError || settings.hasUsableSnapshot) {
      return;
    }
    Alert.alert("Couldn't load profile settings", settings.loadError);
  }, [settings.hasUsableSnapshot, settings.loadError]);

  useEffect(() => {
    let active = true;

    const loadPhotoUrl = async () => {
      if (!settings.avatarPath) {
        if (active) {
          setPhotoUrl(null);
        }
        return;
      }

      const result = await getProfilePhotoSignedUrl(settings.avatarPath);
      if (!active) {
        return;
      }

      setPhotoUrl(result.data?.signedUrl ?? null);
    };

    void loadPhotoUrl();

    return () => {
      active = false;
    };
  }, [settings.avatarPath]);

  const editableFieldRows = useMemo<EditableFieldRow[]>(() => {
    const editableFieldValues = {
      displayName: settings.displayName,
      username: settings.username,
      bio: settings.bio,
      avatarPath: settings.avatarPath,
      preferredUnit: settings.preferredUnit,
      timezone: settings.timezone,
      accountVisibility: settings.accountVisibility,
      progressVisibility: settings.progressVisibility,
      socialEnabled: settings.socialEnabled,
      weighInShareVisibility: settings.weighInShareVisibility,
      gymEventShareVisibility: settings.gymEventShareVisibility,
      postShareVisibility: settings.postShareVisibility,
      autoSupportEnabled: settings.autoSupportEnabled,
      autoSupportConsentedAt: settings.autoSupportConsentedAt,
      appleHealthStepsEnabled: settings.appleHealthStepsEnabled,
      dailyStepGoal: settings.dailyStepGoal,
    };

    return (
      ["displayName", "username", "bio", "timezone", "dailyStepGoal"] as EditableProfileSettingsFieldKey[]
    ).map((fieldKey) => {
      const field = profileSettingsEditableFields[fieldKey];
      const preview = field.getPreview(editableFieldValues);
      return {
        fieldKey,
        label: field.label,
        value: preview.value,
        usesPlaceholder: preview.usesPlaceholder,
      };
    });
  }, [
    settings.accountVisibility,
    settings.appleHealthStepsEnabled,
    settings.autoSupportConsentedAt,
    settings.autoSupportEnabled,
    settings.avatarPath,
    settings.bio,
    settings.dailyStepGoal,
    settings.displayName,
    settings.gymEventShareVisibility,
    settings.postShareVisibility,
    settings.preferredUnit,
    settings.progressVisibility,
    settings.socialEnabled,
    settings.timezone,
    settings.username,
    settings.weighInShareVisibility,
  ]);

  const handleImmediateSaveError = useCallback((title: string, message?: string) => {
    if (!message) {
      return;
    }
    Alert.alert(title, message);
  }, []);

  const handleAccountVisibilityChange = useCallback(async (next: "private" | "public") => {
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

    const result = await settings.updateProfileValues(nextValues);
    handleImmediateSaveError("Couldn't update profile visibility", result.error);
  }, [handleImmediateSaveError, settings]);

  const handleSocialEnabledToggle = useCallback(async (enabled: boolean) => {
    const result = await settings.updateProfileValues({ socialEnabled: enabled });
    handleImmediateSaveError("Couldn't update social features", result.error);
  }, [handleImmediateSaveError, settings]);

  const handleWeighInShareToggle = useCallback(async (enabled: boolean) => {
    const result = await settings.updateProfileValues({
      weighInShareVisibility: enabled ? "followers" : "private",
    });
    handleImmediateSaveError("Couldn't update weigh-in sharing", result.error);
  }, [handleImmediateSaveError, settings]);

  const handleGymEventShareToggle = useCallback(async (enabled: boolean) => {
    const result = await settings.updateProfileValues({
      gymEventShareVisibility: enabled ? "followers" : "private",
    });
    handleImmediateSaveError("Couldn't update gym sharing", result.error);
  }, [handleImmediateSaveError, settings]);

  const handlePostShareToggle = useCallback(async (enabled: boolean) => {
    const result = await settings.updateProfileValues({
      postShareVisibility: enabled ? "followers" : "private",
    });
    handleImmediateSaveError("Couldn't update post sharing", result.error);
  }, [handleImmediateSaveError, settings]);

  const handleProgressVisibilityToggle = useCallback(async (enabled: boolean) => {
    const result = await settings.updateProfileValues({
      progressVisibility: enabled ? "public" : "private",
    });
    handleImmediateSaveError("Couldn't update progress visibility", result.error);
  }, [handleImmediateSaveError, settings]);

  const handlePreferredUnitChange = useCallback(async (nextUnit: "lb" | "kg") => {
    const result = await settings.updateProfileValues({ preferredUnit: nextUnit });
    handleImmediateSaveError("Couldn't update preferred unit", result.error);
  }, [handleImmediateSaveError, settings]);

  const handleSetPhoneNudgesEnabled = useCallback(async (enabled: boolean) => {
    const result = await settings.setPhoneNudgesEnabled(enabled);
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
  }, [settings]);

  const handleGrantAutoSupportConsent = useCallback(async (): Promise<boolean> => {
    const result = await settings.grantAutoSupportConsent();
    if (!result.success && result.error) {
      Alert.alert("Couldn't save consent", result.error);
      return false;
    }
    if (!result.success) {
      return false;
    }

    Alert.alert(
      "Consent saved",
      "Private auto-support is on for future behind-goal triggers. This week's request stays suppressed and won't backfill.",
    );
    return true;
  }, [settings]);

  const handleAppleHealthStepsToggle = useCallback(async (enabled: boolean) => {
    const result = await settings.setAppleHealthStepsEnabled(enabled);
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
  }, [settings]);

  const handleAutoSupportToggle = useCallback((enabled: boolean) => {
    if (!enabled) {
      void (async () => {
        const result = await settings.updateProfileValues({ autoSupportEnabled: false });
        handleImmediateSaveError("Couldn't disable auto support", result.error);
      })();
      return;
    }

    settings.setAutoSupportEnabled(true);
    Alert.alert(
      "Allow private auto-support?",
      "When you're behind, Stabilify can post a private support request to your close friends. It won't share weight, photos, or location details.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            settings.setAutoSupportEnabled(false);
          },
        },
        {
          text: "I agree",
          onPress: () => {
            void (async () => {
              const consentSaved = await handleGrantAutoSupportConsent();
              if (!consentSaved) {
                settings.setAutoSupportEnabled(false);
              }
            })();
          },
        },
      ],
    );
  }, [handleGrantAutoSupportConsent, handleImmediateSaveError, settings]);

  const ensureNotificationPermission = useCallback(async () => {
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
  }, []);

  const handleSendTestNotification = useCallback(async () => {
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
  }, [ensureNotificationPermission, sendingTestNotification]);

  const handleSendDelayedTestNotification = useCallback(async () => {
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
  }, [ensureNotificationPermission, sendingDelayedTestNotification]);

  const handleShowPushDebugInfo = useCallback(async () => {
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
  }, [loadingPushDebugInfo]);

  const openEditableField = useCallback(
    (fieldKey: EditableProfileSettingsFieldKey) => {
      navigation.navigate("ProfileSettingsTextEdit", { fieldKey });
    },
    [navigation],
  );

  return {
    ...settings,
    editableFieldRows,
    handleAccountVisibilityChange,
    handleAppleHealthStepsToggle,
    handleAutoSupportToggle,
    handleGymEventShareToggle,
    handlePostShareToggle,
    handlePreferredUnitChange,
    handleProgressVisibilityToggle,
    handleSendDelayedTestNotification,
    handleSendTestNotification,
    handleSetPhoneNudgesEnabled,
    handleShowPushDebugInfo,
    handleSocialEnabledToggle,
    handleWeighInShareToggle,
    loadingPushDebugInfo,
    openEditableField,
    openPhotoActions,
    photoLoading,
    photoUrl,
    sendingDelayedTestNotification,
    sendingTestNotification,
    setShowAdvancedPrivacy,
    showAdvancedPrivacy,
  };
}
