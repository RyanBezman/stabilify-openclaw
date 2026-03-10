import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import {
  fetchHasActivePushNotificationDevice,
  registerPushNotificationDevice,
} from "../../data/supportAutomation";
import { getExpoProjectId } from "../../utils/expo";
import { fail, ok, type Result } from "./result";

export type PushRegistrationOutcome = {
  hasActiveDevice: boolean;
  token: string;
};

export async function requestExpoPushToken(): Promise<Result<{ token: string }>> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermission.status;
  if (finalStatus !== "granted") {
    const request = await Notifications.requestPermissionsAsync();
    finalStatus = request.status;
  }

  if (finalStatus !== "granted") {
    return fail("Phone notification permission is required to enable phone notifications.");
  }

  try {
    const configuredProjectId = getExpoProjectId();
    const tokenResult = configuredProjectId
      ? await Notifications.getExpoPushTokenAsync({ projectId: configuredProjectId })
      : await Notifications.getExpoPushTokenAsync();
    const token = tokenResult.data?.trim();
    if (!token) {
      return fail("Couldn't read Expo push token for this device.");
    }

    return ok({ token });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Couldn't fetch Expo push token.";
    if (errorMessage.toLowerCase().includes("projectid")) {
      return fail(
        "Push notifications are not configured for this build (missing EXPO_PUBLIC_EXPO_PROJECT_ID).",
      );
    }

    return fail(`Couldn't fetch Expo push token: ${errorMessage}`);
  }
}

export async function registerCurrentPushDevice(
  userId?: string | null,
): Promise<Result<PushRegistrationOutcome>> {
  const tokenResult = await requestExpoPushToken();
  if (tokenResult.error || !tokenResult.data) {
    return tokenResult;
  }

  const registrationResult = await registerPushNotificationDevice({
    expoPushToken: tokenResult.data.token,
    platform: Platform.OS,
    appVersion: process.env.EXPO_PUBLIC_APP_VERSION ?? null,
  });

  if (registrationResult.error) {
    return fail(registrationResult.error);
  }

  const pushDeviceResult = await fetchHasActivePushNotificationDevice(userId ?? undefined);
  if (pushDeviceResult.error) {
    return ok({
      token: tokenResult.data.token,
      hasActiveDevice: true,
    });
  }

  return ok({
    token: tokenResult.data.token,
    hasActiveDevice: pushDeviceResult.data?.hasActiveDevice ?? true,
  });
}
