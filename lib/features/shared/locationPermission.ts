import { Alert } from "react-native";
import * as Location from "expo-location";

type ForegroundLocationPermission = Awaited<
  ReturnType<typeof Location.getForegroundPermissionsAsync>
>;

function showGymLocationPermissionPrimer(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (value: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(value);
    };

    Alert.alert(
      "Use location for gym check-ins?",
      "Stabilify uses your location only while you find your gym or log a gym session. This helps verify that a check-in happened at your saved gym so it can count as verified. We do not use background location, and your exact location is not shared in support posts.",
      [
        {
          text: "Not now",
          style: "cancel",
          onPress: () => finish(false),
        },
        {
          text: "Continue",
          onPress: () => finish(true),
        },
      ],
      {
        cancelable: true,
        onDismiss: () => finish(false),
      },
    );
  });
}

export async function requestForegroundLocationPermissionWithPrimer(): Promise<ForegroundLocationPermission | null> {
  const existingPermission = await Location.getForegroundPermissionsAsync();

  if (existingPermission.status === "granted") {
    return existingPermission;
  }

  if (existingPermission.status === "undetermined") {
    const shouldContinue = await showGymLocationPermissionPrimer();
    if (!shouldContinue) {
      return null;
    }
  }

  return Location.requestForegroundPermissionsAsync();
}
