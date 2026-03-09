import { Platform } from "react-native";
import { fail, ok, type Result } from "../features/shared";

type AppleHealthKitPermission = "StepCount";

type AppleHealthKitPermissions = {
  permissions: {
    read: AppleHealthKitPermission[];
    write: AppleHealthKitPermission[];
  };
};

type AppleHealthKitStepCountOptions = {
  date: string;
  includeManuallyAdded: boolean;
};

type AppleHealthKitValue = {
  value: number;
};

type AppleHealthKitNativeModule = {
  isAvailable: (
    callback: (error: object | null, results: boolean) => void,
  ) => void;
  initHealthKit: (
    permissions: AppleHealthKitPermissions,
    callback: (error: string | null, result: number) => void,
  ) => void;
  getStepCount: (
    options: AppleHealthKitStepCountOptions,
    callback: (error: string | null, results: AppleHealthKitValue) => void,
  ) => void;
};

const HEALTHKIT_STEP_PERMISSIONS: AppleHealthKitPermissions = {
  permissions: {
    read: ["StepCount"],
    write: [],
  },
};

function getAppleHealthNativeModule(): AppleHealthKitNativeModule | null {
  const reactNative = require("react-native") as {
    NativeModules?: {
      AppleHealthKit?: AppleHealthKitNativeModule;
    };
  };

  return reactNative.NativeModules?.AppleHealthKit ?? null;
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

function getNativeModuleOrFail(): Result<{ module: AppleHealthKitNativeModule }> {
  const module = getAppleHealthNativeModule();
  if (!module) {
    return fail(
      "Apple Health is unavailable in this build. Reinstall the latest iOS dev client or production build.",
    );
  }

  return ok({ module });
}

function checkHealthKitAvailability(): Promise<Result<{ available: true }>> {
  return new Promise((resolve) => {
    const moduleResult = getNativeModuleOrFail();
    if (moduleResult.error || !moduleResult.data) {
      resolve(moduleResult);
      return;
    }

    moduleResult.data.module.isAvailable((_error, results) => {
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
    const moduleResult = getNativeModuleOrFail();
    if (moduleResult.error || !moduleResult.data) {
      resolve(moduleResult);
      return;
    }

    moduleResult.data.module.initHealthKit(HEALTHKIT_STEP_PERMISSIONS, (error) => {
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
  const supportResult = ensureIosSupport();
  if (supportResult.error) {
    return supportResult;
  }

  const moduleResult = getNativeModuleOrFail();
  if (moduleResult.error || !moduleResult.data) {
    return moduleResult;
  }

  const accessResult = await requestAppleHealthStepReadAccess();
  if (accessResult.error) {
    return accessResult;
  }

  return new Promise((resolve) => {
    moduleResult.data.module.getStepCount(
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
