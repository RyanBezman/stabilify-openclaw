// @vitest-environment jsdom
// @ts-nocheck
import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveCoach } from "../types";

const mocks = vi.hoisted(() => ({
  hydrateCoachDashboard: vi.fn(),
  fetchNutritionCheckins: vi.fn(),
  subscribeCoachSyncEvents: vi.fn(),
  syncListeners: new Set<(event: unknown) => void>(),
}));

vi.mock("../services/dashboard", () => ({
  hydrateCoachDashboard: mocks.hydrateCoachDashboard,
}));

vi.mock("../services/checkins", () => ({
  fetchNutritionCheckins: mocks.fetchNutritionCheckins,
}));

vi.mock("../services/syncEvents", () => ({
  subscribeCoachSyncEvents: mocks.subscribeCoachSyncEvents,
}));

import { useCoachDashboard } from "./useCoachDashboard";

const coach: ActiveCoach = {
  specialization: "nutrition",
  gender: "woman",
  personality: "strict",
  displayName: "Ruth",
  tagline: "Direct and clear",
};

function createDeferred<T>() {
  let resolve: ((value: T | PromiseLike<T>) => void) | null = null;
  let reject: ((reason?: unknown) => void) | null = null;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    promise,
    resolve: (value: T) => {
      if (!resolve) throw new Error("Deferred promise already settled.");
      resolve(value);
    },
    reject: (reason?: unknown) => {
      if (!reject) throw new Error("Deferred promise already settled.");
      reject(reason);
    },
  };
}

function buildSnapshot() {
  return {
    today: {
      directive: "Protein at each meal.",
      statusIndicators: ["Hydrated", "On plan"],
    },
    training: {
      planId: "workout-plan-v1",
      preview: "Upper/lower split, 4 days.",
      cta: "Open training plan",
    },
    nutrition: {
      planId: "nutrition-plan-v1",
      targetsSummary: "1900 kcal / 140g protein",
      cta: "Open nutrition plan",
      planUpdatedForReview: false,
    },
    weeklyCheckin: {
      nextDueLabel: "Sun",
      isDue: false,
      streak: 2,
      adherenceScore: 82,
      planAcceptedThisWeek: true,
      nextWeekAdherenceDelta: 1.4,
      cta: "Open weekly check-in",
    },
  };
}

function renderUseCoachDashboard(options?: {
  coach?: ActiveCoach | null;
  hydrated?: boolean;
}) {
  return renderHook(() =>
    useCoachDashboard({
      coach: options?.coach ?? coach,
      hydrated: options?.hydrated ?? true,
      specialization: "nutrition",
    }),
  );
}

async function flushAsyncWork(ticks = 4) {
  for (let index = 0; index < ticks; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe("useCoachDashboard", () => {
  beforeEach(() => {
    mocks.hydrateCoachDashboard.mockReset();
    mocks.fetchNutritionCheckins.mockReset();
    mocks.fetchNutritionCheckins.mockResolvedValue({
      history: [],
    });
    mocks.syncListeners.clear();
    mocks.subscribeCoachSyncEvents.mockImplementation((listener: (event: unknown) => void) => {
      mocks.syncListeners.add(listener);
      return () => {
        mocks.syncListeners.delete(listener);
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps refresh callback stable across state changes", async () => {
    mocks.hydrateCoachDashboard.mockResolvedValue(buildSnapshot());

    const hook = renderUseCoachDashboard();
    const initialRefresh = hook.result.current.refresh;

    await flushAsyncWork();
    expect(hook.result.current.refresh).toBe(initialRefresh);

    await act(async () => {
      await hook.result.current.refresh("refresh");
    });

    expect(hook.result.current.refresh).toBe(initialRefresh);

    hook.unmount();
  });

  it("ignores stale dashboard responses when a newer request finishes first", async () => {
    const staleRequest = createDeferred<ReturnType<typeof buildSnapshot>>();
    const freshRequest = createDeferred<ReturnType<typeof buildSnapshot>>();
    const staleSnapshot = buildSnapshot();
    const freshSnapshot = {
      ...buildSnapshot(),
      today: {
        directive: "Lift first, carbs later.",
        statusIndicators: ["Gym planned"],
      },
    };

    mocks.hydrateCoachDashboard
      .mockReturnValueOnce(staleRequest.promise)
      .mockReturnValueOnce(freshRequest.promise);

    const hook = renderUseCoachDashboard();
    await flushAsyncWork(1);

    let refreshPromise: Promise<void> | null = null;
    await act(async () => {
      refreshPromise = hook.result.current.refresh("refresh");
    });

    await act(async () => {
      freshRequest.resolve(freshSnapshot);
      await refreshPromise;
    });

    expect(hook.result.current.snapshot?.today.directive).toBe("Lift first, carbs later.");

    await act(async () => {
      staleRequest.resolve(staleSnapshot);
      await Promise.resolve();
    });

    expect(hook.result.current.snapshot?.today.directive).toBe("Lift first, carbs later.");

    hook.unmount();
  });

  it("keeps snapshot reference stable when refresh data is unchanged", async () => {
    const firstSnapshot = buildSnapshot();
    const secondSnapshot = {
      ...buildSnapshot(),
      today: {
        directive: firstSnapshot.today.directive,
        statusIndicators: [...firstSnapshot.today.statusIndicators],
      },
      training: {
        ...firstSnapshot.training,
      },
      nutrition: {
        ...firstSnapshot.nutrition,
      },
      weeklyCheckin: {
        ...firstSnapshot.weeklyCheckin,
      },
    };

    mocks.hydrateCoachDashboard
      .mockResolvedValueOnce(firstSnapshot)
      .mockResolvedValueOnce(secondSnapshot);

    const hook = renderUseCoachDashboard();
    await flushAsyncWork();
    const loadedSnapshotRef = hook.result.current.snapshot;

    await act(async () => {
      await hook.result.current.refresh("refresh");
    });

    expect(hook.result.current.snapshot).toBe(loadedSnapshotRef);

    hook.unmount();
  });

  it("applies optimistic pending-review state from check-in submission events", async () => {
    const deferredRefresh = createDeferred<ReturnType<typeof buildSnapshot>>();
    mocks.hydrateCoachDashboard
      .mockResolvedValueOnce(buildSnapshot())
      .mockReturnValueOnce(deferredRefresh.promise);

    const hook = renderUseCoachDashboard();
    await flushAsyncWork();

    act(() => {
      for (const listener of mocks.syncListeners) {
        listener({
          type: "checkin_submitted",
          specialization: "nutrition",
          planUpdatedForReview: true,
          submittedAt: Date.now(),
        });
      }
    });

    expect(hook.result.current.effectiveNutritionPendingReview).toBe(true);
    expect(hook.result.current.nutritionSyncing).toBe(true);

    await act(async () => {
      deferredRefresh.resolve({
        ...buildSnapshot(),
        nutrition: {
          ...buildSnapshot().nutrition,
          planUpdatedForReview: true,
        },
      });
      await Promise.resolve();
    });

    expect(hook.result.current.effectiveNutritionPendingReview).toBe(true);
    expect(hook.result.current.nutritionSyncing).toBe(false);

    hook.unmount();
  });

  it("clears optimistic pending-review state when nutrition draft is resolved", async () => {
    mocks.hydrateCoachDashboard.mockResolvedValue({
      ...buildSnapshot(),
      nutrition: {
        ...buildSnapshot().nutrition,
        planUpdatedForReview: true,
      },
    });

    const hook = renderUseCoachDashboard();
    await flushAsyncWork();

    act(() => {
      for (const listener of mocks.syncListeners) {
        listener({
          type: "nutrition_draft_resolved",
          resolution: "promoted",
          resolvedAt: Date.now(),
        });
      }
    });

    expect(hook.result.current.effectiveNutritionPendingReview).toBe(false);
    expect(hook.result.current.nutritionSyncing).toBe(true);

    await flushAsyncWork();

    expect(hook.result.current.nutritionSyncing).toBe(false);

    hook.unmount();
  });

  it("derives weekly recap fields from current-week status and adherence history", async () => {
    mocks.hydrateCoachDashboard.mockResolvedValue({
      ...buildSnapshot(),
      weeklyCheckin: {
        ...buildSnapshot().weeklyCheckin,
        isDue: true,
        planAcceptedThisWeek: null,
      },
    });
    mocks.fetchNutritionCheckins.mockResolvedValueOnce({
      history: [
        {
          weekStart: "2026-02-23",
          adherenceScore: 78,
          adherencePercent: 78,
        },
        {
          weekStart: "2026-02-16",
          adherenceScore: 74,
          adherencePercent: 74,
        },
      ],
    });

    const hook = renderUseCoachDashboard();
    await flushAsyncWork();

    expect(hook.result.current.weeklyRecap.checkinCompleted).toBe(false);
    expect(hook.result.current.weeklyRecap.planAcceptedThisWeek).toBeNull();
    expect(hook.result.current.weeklyRecap.adherenceTrendDirection).toBe("up");
    expect(hook.result.current.weeklyRecap.adherenceTrendDelta).toBe(4);
    expect(hook.result.current.weeklyRecap.cta).toBe("Open weekly check-in");
    expect(hook.result.current.weeklyRecap.nextDueLabel).toBe("Sun");

    hook.unmount();
  });
});
