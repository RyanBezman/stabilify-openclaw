import { useCallback, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { fetchHasActivePushNotificationDevice } from "../../data/supportAutomation";
import { getExpoProjectId } from "../../utils/expo";
import { isPhoneNudgesPermissionError } from "./screenHelpers";

type ProfileSettingsActionResult = {
  success: boolean;
  error?: string;
};

type UseProfileSettingsNotificationsOptions = {
  setPhoneNudgesEnabled: (enabled: boolean) => Promise<ProfileSettingsActionResult>;
};

export function useProfileSettingsNotifications({
  setPhoneNudgesEnabled,
}: UseProfileSettingsNotificationsOptions) {
  const [sendingTestNotification, setSendingTestNotification] = useState(false);
  const [sendingDelayedTestNotification, setSendingDelayedTestNotification] = useState(false);
  const [loadingPushDebugInfo, setLoadingPushDebugInfo] = useState(false);

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

  const handleSetPhoneNudgesEnabled = useCallback(
    async (enabled: boolean) => {
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
    },
    [setPhoneNudgesEnabled],
  );

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

  return {
    handleSendDelayedTestNotification,
    handleSendTestNotification,
    handleSetPhoneNudgesEnabled,
    handleShowPushDebugInfo,
    loadingPushDebugInfo,
    sendingDelayedTestNotification,
    sendingTestNotification,
  };
}
