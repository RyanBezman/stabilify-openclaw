import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  fetchProfileSettingsValues: vi.fn(),
  saveProfileSettingsValues: vi.fn(),
  fetchHasActivePushNotificationDevice: vi.fn(),
  setPhoneNudgesEnabledRemote: vi.fn(),
  allowAutoSupportWithConsent: vi.fn(),
  requestAppleHealthStepReadAccess: vi.fn(),
  registerCurrentPushDevice: vi.fn(),
}));

vi.mock("@react-navigation/native", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      ReactModule.useEffect(() => effect(), [effect]);
    },
  };
});

vi.mock("./data", () => ({
  fetchProfileSettingsValues: mocks.fetchProfileSettingsValues,
  saveProfileSettingsValues: mocks.saveProfileSettingsValues,
}));

vi.mock("../../data/supportAutomation", () => ({
  fetchHasActivePushNotificationDevice: mocks.fetchHasActivePushNotificationDevice,
  setPhoneNudgesEnabled: mocks.setPhoneNudgesEnabledRemote,
  allowAutoSupportWithConsent: mocks.allowAutoSupportWithConsent,
}));

vi.mock("../../data/appleHealth", () => ({
  requestAppleHealthStepReadAccess: mocks.requestAppleHealthStepReadAccess,
}));

vi.mock("../shared", async () => {
  const actual = await vi.importActual<typeof import("../shared")>("../shared");
  return {
    ...actual,
    registerCurrentPushDevice: mocks.registerCurrentPushDevice,
  };
});

import { useProfileSettings } from "./useProfileSettings";

type HookValue = ReturnType<typeof useProfileSettings>;

function buildSettingsValues() {
  return {
    displayName: "User One",
    username: "user_one",
    bio: "",
    avatarPath: null,
    preferredUnit: "lb" as const,
    timezone: "America/New_York",
    accountVisibility: "private" as const,
    progressVisibility: "public" as const,
    socialEnabled: false,
    weighInShareVisibility: "private" as const,
    gymEventShareVisibility: "private" as const,
    postShareVisibility: "private" as const,
    autoSupportEnabled: true,
    autoSupportConsentedAt: null,
    appleHealthStepsEnabled: false,
    dailyStepGoal: 10000,
  };
}

function createDeferred<T>() {
  let resolve: ((value: T) => void) | null = null;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return {
    promise,
    resolve: (value: T) => {
      if (!resolve) {
        throw new Error("Deferred promise already settled.");
      }
      resolve(value);
    },
  };
}

function renderUseProfileSettings() {
  let current: HookValue | null = null;

  function HookHarness() {
    current = useProfileSettings();
    return null;
  }

  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(HookHarness));
  });

  return {
    get current() {
      if (!current) {
        throw new Error("Hook state not available yet.");
      }
      return current;
    },
    unmount: () => act(() => renderer.unmount()),
  };
}

async function flushAsyncWork(ticks = 6) {
  for (let index = 0; index < ticks; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe("useProfileSettings", () => {
  beforeEach(() => {
    mocks.fetchProfileSettingsValues.mockReset();
    mocks.saveProfileSettingsValues.mockReset();
    mocks.fetchHasActivePushNotificationDevice.mockReset();
    mocks.setPhoneNudgesEnabledRemote.mockReset();
    mocks.allowAutoSupportWithConsent.mockReset();
    mocks.requestAppleHealthStepReadAccess.mockReset();
    mocks.registerCurrentPushDevice.mockReset();

    mocks.fetchProfileSettingsValues.mockResolvedValue({
      data: buildSettingsValues(),
    });
    mocks.fetchHasActivePushNotificationDevice.mockResolvedValue({
      data: { hasActiveDevice: false },
    });
  });

  it("hydrates a blocking initial load into a usable snapshot", async () => {
    const hook = renderUseProfileSettings();
    await flushAsyncWork();

    expect(hook.current.loading).toBe(false);
    expect(hook.current.blockingLoad).toBe(false);
    expect(hook.current.hydrated).toBe(true);
    expect(hook.current.hasUsableSnapshot).toBe(true);
    expect(hook.current.displayName).toBe("User One");

    hook.unmount();
  });

  it("uses non-blocking refresh after a snapshot already exists", async () => {
    const hook = renderUseProfileSettings();
    await flushAsyncWork();

    const deferred = createDeferred<{ data: ReturnType<typeof buildSettingsValues> }>();
    mocks.fetchProfileSettingsValues.mockReturnValueOnce(deferred.promise);
    mocks.fetchHasActivePushNotificationDevice.mockResolvedValueOnce({
      data: { hasActiveDevice: true },
    });

    let refreshPromise: Promise<{ success: boolean; error?: string }> | null = null;
    await act(async () => {
      refreshPromise = hook.current.refresh({ blocking: false, preserveOnError: true });
      await Promise.resolve();
    });

    expect(hook.current.loading).toBe(false);
    expect(hook.current.blockingLoad).toBe(false);
    expect(hook.current.refreshing).toBe(true);

    await act(async () => {
      deferred.resolve({ data: buildSettingsValues() });
      if (refreshPromise) {
        await refreshPromise;
      }
    });

    expect(hook.current.refreshing).toBe(false);
    expect(hook.current.hasUsableSnapshot).toBe(true);

    hook.unmount();
  });
});
