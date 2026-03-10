import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  getExpoPushTokenAsync: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
  fetchHasActivePushNotificationDevice: vi.fn(),
  registerPushNotificationDevice: vi.fn(),
  getExpoProjectId: vi.fn(),
}));

vi.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
}));

vi.mock("expo-notifications", () => ({
  AndroidImportance: {
    DEFAULT: "default",
  },
  getPermissionsAsync: mocks.getPermissionsAsync,
  requestPermissionsAsync: mocks.requestPermissionsAsync,
  getExpoPushTokenAsync: mocks.getExpoPushTokenAsync,
  setNotificationChannelAsync: mocks.setNotificationChannelAsync,
}));

vi.mock("../../data/supportAutomation", () => ({
  fetchHasActivePushNotificationDevice: mocks.fetchHasActivePushNotificationDevice,
  registerPushNotificationDevice: mocks.registerPushNotificationDevice,
}));

vi.mock("../../utils/expo", () => ({
  getExpoProjectId: mocks.getExpoProjectId,
}));

import {
  registerCurrentPushDevice,
  requestExpoPushToken,
} from "./pushNotifications";

describe("pushNotifications", () => {
  beforeEach(() => {
    mocks.getPermissionsAsync.mockReset();
    mocks.requestPermissionsAsync.mockReset();
    mocks.getExpoPushTokenAsync.mockReset();
    mocks.setNotificationChannelAsync.mockReset();
    mocks.fetchHasActivePushNotificationDevice.mockReset();
    mocks.registerPushNotificationDevice.mockReset();
    mocks.getExpoProjectId.mockReset();

    mocks.getExpoProjectId.mockReturnValue("expo-project-id");
  });

  it("returns a permission error when notifications stay denied", async () => {
    mocks.getPermissionsAsync.mockResolvedValue({ status: "denied" });
    mocks.requestPermissionsAsync.mockResolvedValue({ status: "denied" });

    const result = await requestExpoPushToken();

    expect(result.error).toBe(
      "Phone notification permission is required to enable phone notifications.",
    );
  });

  it("returns a token error when Expo yields no device token", async () => {
    mocks.getPermissionsAsync.mockResolvedValue({ status: "granted" });
    mocks.getExpoPushTokenAsync.mockResolvedValue({ data: "   " });

    const result = await requestExpoPushToken();

    expect(result.error).toBe("Couldn't read Expo push token for this device.");
  });

  it("registers the current device and returns the active-device state", async () => {
    mocks.getPermissionsAsync.mockResolvedValue({ status: "granted" });
    mocks.getExpoPushTokenAsync.mockResolvedValue({ data: "ExponentPushToken[test]" });
    mocks.registerPushNotificationDevice.mockResolvedValue({});
    mocks.fetchHasActivePushNotificationDevice.mockResolvedValue({
      data: { hasActiveDevice: true },
    });

    const result = await registerCurrentPushDevice("user-1");

    expect(mocks.registerPushNotificationDevice).toHaveBeenCalledWith({
      expoPushToken: "ExponentPushToken[test]",
      platform: "ios",
      appVersion: null,
    });
    expect(mocks.fetchHasActivePushNotificationDevice).toHaveBeenCalledWith("user-1");
    expect(result.data).toEqual({
      token: "ExponentPushToken[test]",
      hasActiveDevice: true,
    });
  });
});
