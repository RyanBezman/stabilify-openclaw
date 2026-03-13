import { Platform } from "react-native";

type ExpoHapticsModule = typeof import("expo-haptics");

let expoHapticsPromise: Promise<ExpoHapticsModule | null> | null = null;

function loadExpoHaptics() {
  if (Platform.OS !== "ios") {
    return Promise.resolve<ExpoHapticsModule | null>(null);
  }

  if (expoHapticsPromise !== null) {
    return expoHapticsPromise;
  }

  expoHapticsPromise = import("expo-haptics").catch(() => null);
  return expoHapticsPromise;
}

export function triggerSelectionHaptic() {
  if (Platform.OS !== "ios") {
    return;
  }

  void loadExpoHaptics().then((module) => {
    if (module === null) {
      return;
    }

    void module.selectionAsync();
  });
}
