import { afterEach, describe, expect, it, vi } from "vitest";

const selectionAsync = vi.fn(async () => undefined);

async function loadHapticsForPlatform(platformOs: "ios" | "android") {
  vi.resetModules();
  vi.doMock("react-native", () => ({
    Platform: {
      OS: platformOs,
    },
  }));
  vi.doMock("expo-haptics", () => ({
    selectionAsync,
  }));

  return import("./haptics");
}

describe("triggerSelectionHaptic", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.doUnmock("react-native");
    vi.doUnmock("expo-haptics");
  });

  it("fires selection haptics on iOS", async () => {
    const { triggerSelectionHaptic } = await loadHapticsForPlatform("ios");

    triggerSelectionHaptic();
    await vi.dynamicImportSettled();
    await Promise.resolve();

    expect(selectionAsync).toHaveBeenCalledTimes(1);
  });

  it("skips selection haptics on non-iOS platforms", async () => {
    const { triggerSelectionHaptic } = await loadHapticsForPlatform("android");

    triggerSelectionHaptic();
    await Promise.resolve();
    await Promise.resolve();

    expect(selectionAsync).not.toHaveBeenCalled();
  });
});
