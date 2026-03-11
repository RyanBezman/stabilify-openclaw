import { Platform } from "react-native";
import { fail, ok, type Result } from "../features/shared";
import type { WeightUnit } from "./types";

type AppleHealthKitPermission = "StepCount" | "Weight";

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

type AppleHealthKitDailyStepCountOptions = {
  startDate: string;
  endDate: string;
  includeManuallyAdded: boolean;
};

type AppleHealthKitValue = {
  value: number;
};

type AppleHealthKitWeightValue = AppleHealthKitValue & {
  startDate: string;
  endDate: string;
};

type AppleHealthKitDailyStepSample = {
  value: number;
  startDate: string;
  endDate: string;
};

type AppleHealthKitWeightUnit = "pound" | "kg";

type AppleHealthKitWeightOptions = {
  unit: AppleHealthKitWeightUnit;
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
  getLatestWeight?: (
    options: AppleHealthKitWeightOptions,
    callback: (error: string | null, results: AppleHealthKitWeightValue) => void,
  ) => void;
  getDailyStepCountSamples?: (
    options: AppleHealthKitDailyStepCountOptions,
    callback: (error: string | null, results: AppleHealthKitDailyStepSample[]) => void,
  ) => void;
};

const HEALTHKIT_STEP_PERMISSIONS: AppleHealthKitPermissions = {
  permissions: {
    read: ["StepCount"],
    write: [],
  },
};

const HEALTHKIT_WEIGHT_PERMISSIONS: AppleHealthKitPermissions = {
  permissions: {
    read: ["Weight"],
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
    return fail("Apple Health is only supported on iPhone.");
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

function initializeHealthKitRead(
  permissions: AppleHealthKitPermissions,
  fallbackMessage: string,
): Promise<Result<{ initialized: true }>> {
  return new Promise((resolve) => {
    const moduleResult = getNativeModuleOrFail();
    if (moduleResult.error || !moduleResult.data) {
      resolve(moduleResult);
      return;
    }

    moduleResult.data.module.initHealthKit(permissions, (error) => {
      if (error) {
        resolve(
          fail(
            normalizeHealthErrorMessage(
              error,
              fallbackMessage,
            ),
          ),
        );
        return;
      }
      resolve(ok({ initialized: true }));
    });
  });
}

function initializeHealthKitStepRead(): Promise<Result<{ initialized: true }>> {
  return initializeHealthKitRead(
    HEALTHKIT_STEP_PERMISSIONS,
    "Couldn't access Apple Health step permissions.",
  );
}

function initializeHealthKitWeightRead(): Promise<Result<{ initialized: true }>> {
  return initializeHealthKitRead(
    HEALTHKIT_WEIGHT_PERMISSIONS,
    "Couldn't access Apple Health weight permissions.",
  );
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

export async function requestAppleHealthWeightReadAccess(): Promise<Result<{ granted: true }>> {
  const supportResult = ensureIosSupport();
  if (supportResult.error) {
    return supportResult;
  }

  const availableResult = await checkHealthKitAvailability();
  if (availableResult.error) {
    return availableResult;
  }

  const initResult = await initializeHealthKitWeightRead();
  if (initResult.error) {
    return initResult;
  }

  return ok({ granted: true });
}

function resolveAppleHealthWeightUnit(unit: WeightUnit): AppleHealthKitWeightUnit {
  return unit === "kg" ? "kg" : "pound";
}

function parseAppleHealthRecordedAt(value: string): Date | null {
  const recordedAt = new Date(value);
  return Number.isNaN(recordedAt.getTime()) ? null : recordedAt;
}

export async function fetchAppleHealthLatestWeight(
  unit: WeightUnit,
): Promise<Result<{ weight: number; unit: WeightUnit; recordedAt: Date }>> {
  const supportResult = ensureIosSupport();
  if (supportResult.error) {
    return supportResult;
  }

  const moduleResult = getNativeModuleOrFail();
  if (moduleResult.error || !moduleResult.data) {
    return moduleResult;
  }

  const getLatestWeight = moduleResult.data.module.getLatestWeight;
  if (typeof getLatestWeight !== "function") {
    return fail(
      "Apple Health weight import is unavailable in this build. Reinstall the latest iOS dev client or production build.",
    );
  }

  const accessResult = await requestAppleHealthWeightReadAccess();
  if (accessResult.error) {
    return accessResult;
  }

  return new Promise((resolve) => {
    getLatestWeight(
      { unit: resolveAppleHealthWeightUnit(unit) },
      (error, results) => {
        if (error) {
          resolve(
            fail(
              normalizeHealthErrorMessage(
                error,
                "Couldn't read your latest weight from Apple Health.",
              ),
            ),
          );
          return;
        }

        if (!Number.isFinite(results.value) || results.value <= 0) {
          resolve(fail("Apple Health returned an invalid weight sample."));
          return;
        }

        const recordedAt = parseAppleHealthRecordedAt(results.startDate);
        if (!recordedAt) {
          resolve(fail("Apple Health returned an invalid weight timestamp."));
          return;
        }

        resolve(
          ok({
            weight: Math.round(results.value * 10) / 10,
            unit,
            recordedAt,
          }),
        );
      },
    );
  });
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

function getLocalRangeWindow(days: number) {
  const safeDays = Math.max(1, Math.floor(days));
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (safeDays - 1));

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    days: safeDays,
  };
}

export async function fetchAppleHealthDailyStepAverage(
  days: number,
): Promise<Result<{ averageDailySteps: number; totalSteps: number; days: number }>> {
  const supportResult = ensureIosSupport();
  if (supportResult.error) {
    return supportResult;
  }

  const moduleResult = getNativeModuleOrFail();
  if (moduleResult.error || !moduleResult.data) {
    return moduleResult;
  }

  const getDailyStepCountSamples = moduleResult.data.module.getDailyStepCountSamples;
  if (typeof getDailyStepCountSamples !== "function") {
    return fail(
      "Apple Health daily history is unavailable in this build. Reinstall the latest iOS dev client or production build.",
    );
  }

  const accessResult = await requestAppleHealthStepReadAccess();
  if (accessResult.error) {
    return accessResult;
  }

  const rangeWindow = getLocalRangeWindow(days);

  return new Promise((resolve) => {
    getDailyStepCountSamples(
      {
        startDate: rangeWindow.startDate,
        endDate: rangeWindow.endDate,
        includeManuallyAdded: false,
      },
      (error, results) => {
        if (error) {
          resolve(
            fail(
              normalizeHealthErrorMessage(
                error,
                "Couldn't read daily step history from Apple Health.",
              ),
            ),
          );
          return;
        }

        const samples = Array.isArray(results) ? results : [];
        let totalSteps = 0;
        for (const sample of samples) {
          if (!Number.isFinite(sample.value) || sample.value < 0) {
            resolve(fail("Apple Health returned an invalid daily step sample."));
            return;
          }
          totalSteps += sample.value;
        }

        resolve(
          ok({
            averageDailySteps: Math.round(totalSteps / rangeWindow.days),
            totalSteps: Math.round(totalSteps),
            days: rangeWindow.days,
          }),
        );
      },
    );
  });
}
