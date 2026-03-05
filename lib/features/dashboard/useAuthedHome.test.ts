import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  fetchDashboardData: vi.fn(),
  fetchActionableNotificationCount: vi.fn(),
  fetchGymSessionValidationRequestForSession: vi.fn(),
  requestGymSessionValidation: vi.fn(),
  getProfilePhotoSignedUrl: vi.fn(),
  getLocalTimeZone: vi.fn(),
  signOutCurrentUser: vi.fn(),
  formatLocalDate: vi.fn(),
  formatShortDate: vi.fn(),
  getConsistencyWindow: vi.fn(),
  getCurrentStreak: vi.fn(),
  fetchCurrentWeekSupportRequest: vi.fn(),
  fetchHasActivePushNotificationDevice: vi.fn(),
  markSupportNudgeOpened: vi.fn(),
  allowAutoSupportWithConsent: vi.fn(),
  deferSupportNudge: vi.fn(),
  setAutoSupportEnabled: vi.fn(),
  registerPushNotificationDevice: vi.fn(),
  grantAutoSupportConsent: vi.fn(),
}));

vi.mock("@react-navigation/native", async () => {
  const ReactModule = await vi.importActual<typeof import("react")>("react");
  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      ReactModule.useEffect(() => effect(), [effect]);
    },
  };
});

vi.mock("../../data/dashboard", () => ({
  fetchDashboardData: mocks.fetchDashboardData,
}));

vi.mock("../../data/notifications", () => ({
  fetchActionableNotificationCount: mocks.fetchActionableNotificationCount,
}));

vi.mock("../../data/gymSessionValidation", () => ({
  fetchGymSessionValidationRequestForSession: mocks.fetchGymSessionValidationRequestForSession,
  requestGymSessionValidation: mocks.requestGymSessionValidation,
}));

vi.mock("../profile", () => ({
  getProfilePhotoSignedUrl: mocks.getProfilePhotoSignedUrl,
}));

vi.mock("../../utils/time", () => ({
  getLocalTimeZone: mocks.getLocalTimeZone,
}));

vi.mock("../auth", () => ({
  signOutCurrentUser: mocks.signOutCurrentUser,
}));

vi.mock("expo-notifications", () => ({
  AndroidImportance: {
    DEFAULT: "default",
  },
  setNotificationChannelAsync: vi.fn(),
  getPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted" }),
  getExpoPushTokenAsync: vi.fn().mockResolvedValue({ data: "ExponentPushToken[mock]" }),
}));

vi.mock("../../utils/metrics", () => ({
  formatLocalDate: mocks.formatLocalDate,
  formatShortDate: mocks.formatShortDate,
  getConsistencyWindow: mocks.getConsistencyWindow,
  getCurrentStreak: mocks.getCurrentStreak,
}));

vi.mock("../../data/supportAutomation", () => ({
  fetchCurrentWeekSupportRequest: mocks.fetchCurrentWeekSupportRequest,
  fetchHasActivePushNotificationDevice: mocks.fetchHasActivePushNotificationDevice,
  markSupportNudgeOpened: mocks.markSupportNudgeOpened,
  allowAutoSupportWithConsent: mocks.allowAutoSupportWithConsent,
  deferSupportNudge: mocks.deferSupportNudge,
  setAutoSupportEnabled: mocks.setAutoSupportEnabled,
  registerPushNotificationDevice: mocks.registerPushNotificationDevice,
  grantAutoSupportConsent: mocks.grantAutoSupportConsent,
}));

import { useAuthedHome } from "./useAuthedHome";

type HookValue = ReturnType<typeof useAuthedHome>;

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

function buildSupportRequest() {
  return {
    id: "support-request-1",
    userId: "user-1",
    weekStart: "2026-03-02",
    weekEnd: "2026-03-08",
    triggerReason: "missed_weekly_target" as const,
    status: "suppressed_no_consent" as const,
    outcomePostId: null,
    nudgeOpenedAt: "2026-03-03T12:00:00.000Z",
    nudgeOpenedSurface: "home" as const,
    createdAt: "2026-03-03T11:00:00.000Z",
    updatedAt: "2026-03-03T12:00:00.000Z",
  };
}

function buildDashboardData(overrides?: {
  autoSupportEnabled?: boolean;
  autoSupportConsentAt?: string | null;
}) {
  return {
    profile: {
      username: "user_1",
      displayName: "User One",
      bio: "",
      membershipTier: "free" as const,
      preferredUnit: "lb" as const,
      timezone: "America/New_York",
      avatarPath: null,
      accountVisibility: "private" as const,
      progressVisibility: "public" as const,
      socialEnabled: false,
      weighInShareVisibility: "private" as const,
      gymEventShareVisibility: "private" as const,
      postShareVisibility: "private" as const,
      autoSupportEnabled: overrides?.autoSupportEnabled ?? true,
      autoSupportConsentAt: overrides?.autoSupportConsentAt ?? null,
    },
    goal: null,
    routine: null,
    weighIns: [] as Array<{ weight: number; localDate: string }>,
    gymSessions: [] as Array<{ id: string; sessionDate: string; status: "verified" | "partial" | "provisional" }>,
    gymWeekStart: "2026-03-02",
    gymWeekEnd: "2026-03-08",
  };
}

function renderUseAuthedHome() {
  let current: HookValue | null = null;

  function HookHarness() {
    current = useAuthedHome({
      id: "user-1",
      email: "user@example.com",
      user_metadata: { full_name: "User One" },
    });
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

describe("useAuthedHome support nudge hardening", () => {
  beforeEach(() => {
    mocks.fetchDashboardData.mockReset();
    mocks.fetchActionableNotificationCount.mockReset();
    mocks.fetchGymSessionValidationRequestForSession.mockReset();
    mocks.requestGymSessionValidation.mockReset();
    mocks.getProfilePhotoSignedUrl.mockReset();
    mocks.getLocalTimeZone.mockReset();
    mocks.signOutCurrentUser.mockReset();
    mocks.formatLocalDate.mockReset();
    mocks.formatShortDate.mockReset();
    mocks.getConsistencyWindow.mockReset();
    mocks.getCurrentStreak.mockReset();
    mocks.fetchCurrentWeekSupportRequest.mockReset();
    mocks.fetchHasActivePushNotificationDevice.mockReset();
    mocks.markSupportNudgeOpened.mockReset();
    mocks.allowAutoSupportWithConsent.mockReset();
    mocks.deferSupportNudge.mockReset();
    mocks.setAutoSupportEnabled.mockReset();
    mocks.registerPushNotificationDevice.mockReset();
    mocks.grantAutoSupportConsent.mockReset();

    mocks.fetchDashboardData.mockResolvedValue({ data: buildDashboardData() });
    mocks.fetchActionableNotificationCount.mockResolvedValue({ data: { count: 0 } });
    mocks.fetchHasActivePushNotificationDevice.mockResolvedValue({
      data: { hasActiveDevice: false },
    });
    mocks.markSupportNudgeOpened.mockResolvedValue({
      data: {
        requestId: "support-request-1",
        nudgeOpenedAt: "2026-03-03T12:00:00.000Z",
        nudgeOpenedSurface: "home",
        wasFirstOpen: true,
      },
    });
    mocks.getProfilePhotoSignedUrl.mockResolvedValue({ data: { signedUrl: null } });
    mocks.getLocalTimeZone.mockReturnValue("America/New_York");
    mocks.signOutCurrentUser.mockResolvedValue({ data: { ok: true } });
    mocks.formatLocalDate.mockReturnValue("2026-03-03");
    mocks.formatShortDate.mockImplementation((value: string) => value);
    mocks.getConsistencyWindow.mockReturnValue({
      daysWithWeighIns: 0,
      totalDays: 7,
      percent: 0,
    });
    mocks.getCurrentStreak.mockReturnValue(0);
  });

  it("defers the support nudge and clears visible request after refresh", async () => {
    const supportRequest = buildSupportRequest();
    mocks.fetchCurrentWeekSupportRequest
      .mockResolvedValueOnce({ data: supportRequest })
      .mockResolvedValueOnce({ data: null });
    mocks.deferSupportNudge.mockResolvedValue({
      data: {
        requestId: "support-request-1",
        deferredUntilLocalDate: "2026-03-04",
      },
    });

    const hook = renderUseAuthedHome();
    await flushAsyncWork();

    expect(hook.current.supportRequest?.id).toBe("support-request-1");
    expect(hook.current.supportNudgeVariant).toBe("suppressed_prompt");

    await act(async () => {
      await hook.current.deferAutoSupportFromNudge();
    });
    await flushAsyncWork();

    expect(mocks.deferSupportNudge).toHaveBeenCalledWith({
      requestId: "support-request-1",
      surface: "home",
    });
    expect(hook.current.supportRequest).toBeNull();
    expect(hook.current.supportNudgeVariant).toBeNull();

    hook.unmount();
  });

  it("uses atomic allow flow and switches to suppressed_acknowledged variant", async () => {
    const supportRequest = buildSupportRequest();
    mocks.fetchCurrentWeekSupportRequest
      .mockResolvedValueOnce({ data: supportRequest })
      .mockResolvedValueOnce({ data: supportRequest });
    mocks.allowAutoSupportWithConsent.mockResolvedValue({
      data: {
        autoSupportEnabled: true,
        autoSupportConsentedAt: "2026-03-03T16:00:00.000Z",
        changedEnabled: false,
        changedConsent: true,
      },
    });

    const hook = renderUseAuthedHome();
    await flushAsyncWork();

    expect(hook.current.supportNudgeVariant).toBe("suppressed_prompt");

    await act(async () => {
      await hook.current.allowAutoSupportFromNudge();
    });
    await flushAsyncWork();

    expect(mocks.allowAutoSupportWithConsent).toHaveBeenCalledTimes(1);
    expect(hook.current.supportRequest?.status).toBe("suppressed_no_consent");
    expect(hook.current.supportNudgeVariant).toBe("suppressed_acknowledged");

    hook.unmount();
  });

  it("derives suppressed_acknowledged from persisted profile consent after remount", async () => {
    const supportRequest = buildSupportRequest();
    mocks.fetchDashboardData.mockResolvedValueOnce({
      data: buildDashboardData({
        autoSupportEnabled: true,
        autoSupportConsentAt: "2026-03-03T16:00:00.000Z",
      }),
    });
    mocks.fetchCurrentWeekSupportRequest.mockResolvedValueOnce({ data: supportRequest });

    const hook = renderUseAuthedHome();
    await flushAsyncWork();

    expect(hook.current.supportRequest?.status).toBe("suppressed_no_consent");
    expect(hook.current.supportNudgeVariant).toBe("suppressed_acknowledged");

    hook.unmount();
  });

  it("keeps suppressed prompt when atomic allow fails", async () => {
    const supportRequest = buildSupportRequest();
    mocks.fetchCurrentWeekSupportRequest.mockResolvedValueOnce({ data: supportRequest });
    mocks.allowAutoSupportWithConsent.mockResolvedValue({
      error: "atomic failed",
    });

    const hook = renderUseAuthedHome();
    await flushAsyncWork();

    let result: { success: boolean; error?: string } | null = null;
    await act(async () => {
      result = await hook.current.allowAutoSupportFromNudge();
    });

    expect(result).toEqual({
      success: false,
      error: "atomic failed",
    });
    expect(hook.current.supportNudgeVariant).toBe("suppressed_prompt");
    expect(mocks.allowAutoSupportWithConsent).toHaveBeenCalledTimes(1);

    hook.unmount();
  });

  it("blocks duplicate allow calls while one support action is in flight", async () => {
    const supportRequest = buildSupportRequest();
    const deferred = createDeferred<{
      data: {
        autoSupportEnabled: boolean;
        autoSupportConsentedAt: string;
        changedEnabled: boolean;
        changedConsent: boolean;
      };
    }>();

    mocks.fetchCurrentWeekSupportRequest
      .mockResolvedValueOnce({ data: supportRequest })
      .mockResolvedValueOnce({ data: supportRequest });
    mocks.allowAutoSupportWithConsent.mockReturnValueOnce(deferred.promise);

    const hook = renderUseAuthedHome();
    await flushAsyncWork();

    let firstCallPromise: Promise<{ success: boolean; error?: string }> | null = null;
    await act(async () => {
      firstCallPromise = hook.current.allowAutoSupportFromNudge();
    });

    let secondResult: { success: boolean; error?: string } | null = null;
    await act(async () => {
      secondResult = await hook.current.allowAutoSupportFromNudge();
    });

    expect(secondResult).toEqual({ success: false });
    expect(mocks.allowAutoSupportWithConsent).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve({
        data: {
          autoSupportEnabled: true,
          autoSupportConsentedAt: "2026-03-03T16:00:00.000Z",
          changedEnabled: true,
          changedConsent: true,
        },
      });
      if (firstCallPromise) {
        await firstCallPromise;
      }
    });

    expect(mocks.allowAutoSupportWithConsent).toHaveBeenCalledTimes(1);
    hook.unmount();
  });
});
