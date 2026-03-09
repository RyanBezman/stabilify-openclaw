import { Platform } from "react-native";
import AppleHealthKit, { type HealthKitPermissions } from "react-native-health";
import { fail, ok, type Result } from "../features/shared";

const HEALTHKIT_STEP_PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [AppleHealthKit.Constants.Permissions.StepCount],
    write: [],
  },
};

function hasHealthKitMethod(
  method: "isAvailable" | "initHealthKit" | "getStepCount",
): boolean {
  const candidate = AppleHealthKit[method];
  return typeof candidate === "function";
}

function normalizeHealthErrorMessage(
  message: string | null | undefined,
  fallback: string,
): string {
  const trimmed = message?.trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed;
}

function ensureIosSupport(): Result<{ supported: true }> {
  if (Platform.OS !== "ios") {
    return fail("Apple Health step tracking is only supported on iPhone.");
  }
  return ok({ supported: true });
}

function checkHealthKitAvailability(): Promise<Result<{ available: true }>> {
  return new Promise((resolve) => {
    if (!hasHealthKitMethod("isAvailable")) {
      resolve(
        fail(
          "Apple Health is unavailable in this build. Use an iOS custom dev client or production build.",
        ),
      );
      return;
    }
    AppleHealthKit.isAvailable((_error, results) => {
      if (!results) {
        resolve(fail("Apple Health is not available on this device."));
        return;
      }
      resolve(ok({ available: true }));
    });
  });
}

function initializeHealthKitStepRead(): Promise<Result<{ initialized: true }>> {
  return new Promise((resolve) => {
    if (!hasHealthKitMethod("initHealthKit")) {
      resolve(
        fail(
          "Apple Health permissions are unavailable in this build. Use an iOS custom dev client or production build.",
        ),
      );
      return;
    }
    AppleHealthKit.initHealthKit(HEALTHKIT_STEP_PERMISSIONS, (error) => {
      if (error) {
        resolve(
          fail(
            normalizeHealthErrorMessage(
              error,
              "Couldn't access Apple Health step permissions.",
            ),
          ),
        );
        return;
      }
      resolve(ok({ initialized: true }));
    });
  });
}

export async function requestAppleHealthStepReadAccess(): Promise<Result<{ granted: true }>> {
  const supportResult = ensureIosSupport();
  if (supportResult.error) {
    return supportResult;
  }

  const availableResult = await checkHealthKitAvailability();
  if (availableResult.error) {
    return availableResult;
  }

  const initResult = await initializeHealthKitStepRead();
  if (initResult.error) {
    return initResult;
  }

  return ok({ granted: true });
}

export async function fetchAppleHealthTodayStepCount(): Promise<Result<{ steps: number }>> {
  const accessResult = await requestAppleHealthStepReadAccess();
  if (accessResult.error) {
    return accessResult;
  }

  return new Promise((resolve) => {
    if (!hasHealthKitMethod("getStepCount")) {
      resolve(
        fail(
          "Apple Health step reads are unavailable in this build. Use an iOS custom dev client or production build.",
        ),
      );
      return;
    }
    AppleHealthKit.getStepCount(
      {
        date: new Date().toISOString(),
        includeManuallyAdded: false,
      },
      (error, results) => {
        if (error) {
          resolve(
            fail(
              normalizeHealthErrorMessage(
                error,
                "Couldn't read today's step count from Apple Health.",
              ),
            ),
          );
          return;
        }

        if (!Number.isFinite(results.value) || results.value < 0) {
          resolve(fail("Apple Health returned an invalid step count."));
          return;
        }

        resolve(ok({ steps: Math.floor(results.value) }));
      },
    );
  });
}
