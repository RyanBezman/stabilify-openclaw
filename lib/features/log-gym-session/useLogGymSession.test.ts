import { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderTestHook } from "../../../test/utils/renderHook";

type CameraPermission = {
  granted: boolean;
};

type CameraPermissionResponse = {
  granted: boolean;
};

type CameraAsset = {
  uri: string;
  mimeType: string | null;
  fileName: string | null;
  base64: string | null;
};

type CameraResult = {
  canceled: boolean;
  assets?: CameraAsset[];
};

type LocationPermissionResponse = {
  status: "granted" | "denied" | "undetermined";
};

const mocks = vi.hoisted(() => ({
  useCameraPermissions: vi.fn<() => [CameraPermission | null, () => Promise<CameraPermissionResponse>]>(),
  requestCameraPermission: vi.fn<() => Promise<CameraPermissionResponse>>(),
  launchCameraAsync: vi.fn<(options: object) => Promise<CameraResult>>(),
  getForegroundPermissionsAsync: vi.fn<() => Promise<LocationPermissionResponse>>(),
  requestForegroundPermissionsAsync: vi.fn<() => Promise<LocationPermissionResponse>>(),
  getCurrentPositionAsync: vi.fn<() => Promise<{ coords: { latitude: number; longitude: number } }>>(),
  fetchGymSessionDefaults: vi.fn<() => Promise<{ data: { timezone: string } | null; error?: string }>>(),
  saveGymSession: vi.fn(),
  alert: vi.fn<(title: string, message?: string) => void>(),
}));

vi.mock("react-native", () => ({
  Alert: {
    alert: mocks.alert,
  },
}));

vi.mock("expo-image-picker", () => ({
  useCameraPermissions: mocks.useCameraPermissions,
  launchCameraAsync: mocks.launchCameraAsync,
  MediaTypeOptions: {
    Images: "images",
  },
}));

vi.mock("expo-location", () => ({
  getForegroundPermissionsAsync: mocks.getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync: mocks.requestForegroundPermissionsAsync,
  getCurrentPositionAsync: mocks.getCurrentPositionAsync,
  Accuracy: {
    Balanced: "balanced",
  },
}));

vi.mock("../../data/gymSessions", () => ({
  fetchGymSessionDefaults: mocks.fetchGymSessionDefaults,
  saveGymSession: mocks.saveGymSession,
}));

import { useLogGymSession } from "./useLogGymSession";

async function flushAsyncWork(ticks = 4) {
  for (let index = 0; index < ticks; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe("useLogGymSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requestCameraPermission.mockResolvedValue({ granted: true });
    mocks.useCameraPermissions.mockReturnValue([{ granted: true }, mocks.requestCameraPermission]);
    mocks.launchCameraAsync.mockResolvedValue({ canceled: true, assets: [] });
    mocks.getForegroundPermissionsAsync.mockResolvedValue({ status: "undetermined" });
    mocks.requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    mocks.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 40.7128, longitude: -74.006 },
    });
    mocks.fetchGymSessionDefaults.mockResolvedValue({
      data: { timezone: "America/New_York" },
    });
  });

  it("does not auto-open the camera on mount", async () => {
    const hook = renderTestHook(() => useLogGymSession());
    await flushAsyncWork();

    expect(mocks.launchCameraAsync).not.toHaveBeenCalled();
    expect(mocks.requestCameraPermission).not.toHaveBeenCalled();

    hook.unmount();
  });

  it("requests camera permission only when handleCapture is triggered", async () => {
    mocks.useCameraPermissions.mockReturnValue([{ granted: false }, mocks.requestCameraPermission]);
    mocks.requestCameraPermission.mockResolvedValue({ granted: true });
    mocks.launchCameraAsync.mockResolvedValue({ canceled: true, assets: [] });

    const hook = renderTestHook(() => useLogGymSession());
    await flushAsyncWork();

    expect(mocks.requestCameraPermission).not.toHaveBeenCalled();
    expect(mocks.launchCameraAsync).not.toHaveBeenCalled();

    await act(async () => {
      await hook.result.current.handleCapture();
    });

    expect(mocks.requestCameraPermission).toHaveBeenCalledTimes(1);
    expect(mocks.launchCameraAsync).toHaveBeenCalledTimes(1);

    hook.unmount();
  });

  it("requests location permission only when capture location is triggered", async () => {
    mocks.getForegroundPermissionsAsync.mockResolvedValue({ status: "undetermined" });
    mocks.requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });

    const hook = renderTestHook(() => useLogGymSession());
    await flushAsyncWork();

    expect(mocks.getForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(mocks.requestForegroundPermissionsAsync).not.toHaveBeenCalled();

    await act(async () => {
      await hook.result.current.handleCaptureLocation();
    });

    expect(mocks.getForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mocks.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(hook.result.current.coords).toEqual({
      latitude: 40.7128,
      longitude: -74.006,
    });

    hook.unmount();
  });

  it("sets location error and keeps coords null when location permission is denied", async () => {
    mocks.getForegroundPermissionsAsync.mockResolvedValue({ status: "denied" });
    mocks.requestForegroundPermissionsAsync.mockResolvedValue({ status: "denied" });

    const hook = renderTestHook(() => useLogGymSession());
    await flushAsyncWork();

    await act(async () => {
      await hook.result.current.handleCaptureLocation();
    });

    expect(mocks.getCurrentPositionAsync).not.toHaveBeenCalled();
    expect(hook.result.current.locationError).toBe("Location permission is required to verify sessions.");
    expect(hook.result.current.coords).toBeNull();
    expect(hook.result.current.currentStep).toBe(1);

    hook.unmount();
  });

  it("allows saving a partial session after a location denial", async () => {
    mocks.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///photo.jpg",
          mimeType: "image/jpeg",
          fileName: "photo.jpg",
          base64: "YmFzZTY0",
        },
      ],
    });
    mocks.getForegroundPermissionsAsync.mockResolvedValue({ status: "denied" });
    mocks.requestForegroundPermissionsAsync.mockResolvedValue({ status: "denied" });
    mocks.saveGymSession.mockResolvedValue({
      data: {
        sessionId: "session-1",
        status: "partial",
        statusReason: "permission_denied",
        distanceMeters: null,
      },
    });

    const hook = renderTestHook(() => useLogGymSession());
    await flushAsyncWork();

    await act(async () => {
      await hook.result.current.handleCapture();
    });

    expect(hook.result.current.currentStep).toBe(2);

    await act(async () => {
      await hook.result.current.handleCaptureLocation();
    });

    expect(hook.result.current.locationError).toBe("Location permission is required to verify sessions.");
    expect(hook.result.current.canContinueWithoutLocation).toBe(true);
    expect(hook.result.current.currentStep).toBe(2);

    act(() => {
      hook.result.current.handleContinueWithoutLocation();
    });

    expect(hook.result.current.currentStep).toBe(3);
    expect(hook.result.current.continueWithoutLocation).toBe(true);

    await act(async () => {
      const result = await hook.result.current.saveSession();
      expect(result).toEqual({
        saved: true,
        sessionId: "session-1",
        status: "partial",
        statusReason: "permission_denied",
        distanceMeters: null,
      });
    });

    expect(mocks.saveGymSession).toHaveBeenCalledWith(
      expect.objectContaining({
        photoUri: "file:///photo.jpg",
        location: undefined,
        locationPermissionDenied: true,
        status: "partial",
        timezone: "America/New_York",
      }),
    );

    hook.unmount();
  });
});
