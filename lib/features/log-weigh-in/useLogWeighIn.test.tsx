import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  fetchWeighInDefaults: vi.fn(),
  saveWeighIn: vi.fn(),
  fetchAppleHealthLatestWeight: vi.fn(),
}));

vi.mock("../../data/weighIns", () => ({
  fetchWeighInDefaults: mocks.fetchWeighInDefaults,
  saveWeighIn: mocks.saveWeighIn,
}));

vi.mock("../../data/appleHealth", () => ({
  fetchAppleHealthLatestWeight: mocks.fetchAppleHealthLatestWeight,
}));

import { useLogWeighIn } from "./useLogWeighIn";

type HookValue = ReturnType<typeof useLogWeighIn>;

function renderUseLogWeighIn() {
  let current: HookValue | null = null;

  function HookHarness() {
    current = useLogWeighIn();
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

describe("useLogWeighIn", () => {
  beforeEach(() => {
    mocks.fetchWeighInDefaults.mockReset();
    mocks.saveWeighIn.mockReset();
    mocks.fetchAppleHealthLatestWeight.mockReset();

    mocks.fetchWeighInDefaults.mockResolvedValue({
      data: {
        preferredUnit: "lb",
        timezone: "America/New_York",
        latestWeighIn: {
          weight: 181.4,
          unit: "lb",
          recordedAt: "2026-03-08T11:00:00.000Z",
          localDate: "2026-03-08",
        },
      },
    });
  });

  it("hydrates weigh-in defaults", async () => {
    const hook = renderUseLogWeighIn();
    await flushAsyncWork();

    expect(hook.current.initializing).toBe(false);
    expect(hook.current.unit).toBe("lb");
    expect(hook.current.timezone).toBe("America/New_York");
    expect(hook.current.latestWeighIn).toEqual({
      weight: 181.4,
      unit: "lb",
      localDate: "2026-03-08",
    });

    hook.unmount();
  });

  it("imports the latest Apple Health weight into the draft", async () => {
    const hook = renderUseLogWeighIn();
    await flushAsyncWork();

    const sampleDate = new Date("2026-03-10T12:34:00.000Z");
    mocks.fetchAppleHealthLatestWeight.mockResolvedValue({
      data: {
        weight: 179.6,
        unit: "lb",
        recordedAt: sampleDate,
      },
    });

    let result:
      | Awaited<ReturnType<HookValue["importAppleHealthWeight"]>>
      | undefined;
    await act(async () => {
      result = await hook.current.importAppleHealthWeight();
    });

    expect(mocks.fetchAppleHealthLatestWeight).toHaveBeenCalledWith("lb");
    expect(result).toEqual({
      imported: true,
      message: "Imported 179.6 lb from Apple Health. Review the timestamp, then save.",
    });
    expect(hook.current.weight).toBe("179.6");
    expect(hook.current.recordedAt.toISOString()).toBe(sampleDate.toISOString());
    expect(hook.current.appleHealthImportError).toBeNull();
    expect(hook.current.appleHealthImportedSampleLabel).toContain("Tue, Mar 10, 2026");

    hook.unmount();
  });

  it("surfaces Apple Health import failures", async () => {
    const hook = renderUseLogWeighIn();
    await flushAsyncWork();

    mocks.fetchAppleHealthLatestWeight.mockResolvedValue({
      error: "Permission denied.",
    });

    await act(async () => {
      await hook.current.importAppleHealthWeight();
    });

    expect(hook.current.appleHealthImportError).toBe("Permission denied.");
    expect(hook.current.weight).toBe("");
    expect(hook.current.appleHealthImportedSampleLabel).toBeNull();

    hook.unmount();
  });
});
