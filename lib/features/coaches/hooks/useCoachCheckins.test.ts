// @ts-nocheck
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveCoach } from "../types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  hydrateCoachCheckinsWorkflow: vi.fn(),
  submitCoachCheckinWorkflow: vi.fn(),
  publishCoachSyncEvent: vi.fn(),
  subscribeCoachSyncEvents: vi.fn(),
  syncListeners: new Set<(event: unknown) => void>(),
}));

vi.mock("../workflows", () => ({
  hydrateCoachCheckinsWorkflow: mocks.hydrateCoachCheckinsWorkflow,
  submitCoachCheckinWorkflow: mocks.submitCoachCheckinWorkflow,
}));

vi.mock("../services/syncEvents", () => ({
  publishCoachSyncEvent: mocks.publishCoachSyncEvent,
  subscribeCoachSyncEvents: mocks.subscribeCoachSyncEvents,
}));

import {
  __resetCoachCheckinsCacheForTests,
  useCoachCheckins,
} from "./useCoachCheckins";

type HookValue = ReturnType<typeof useCoachCheckins>;

const coach: ActiveCoach = {
  specialization: "nutrition",
  gender: "woman",
  personality: "strict",
  displayName: "Ruth",
  tagline: "Direct and clear",
};

function buildNoDataPayload(overrides?: Partial<{
  threadId: string;
  weekStart: string;
  weekEnd: string;
  energy: number;
  adherencePercent: number;
  blockers: string;
  coachSummary: string | null;
  summaryModel: string | null;
  updatedAt: string;
}>) {
  const weekStart = overrides?.weekStart ?? "2026-02-23";
  const weekEnd = overrides?.weekEnd ?? "2026-03-01";
  const updatedAt = overrides?.updatedAt ?? "2026-02-25T01:00:00.000Z";
  return {
    threadId: overrides?.threadId ?? "thread-1",
    weekStart,
    weekEnd,
    weightSnapshot: {
      unit: "lb" as const,
      entries: 0,
      startWeight: null,
      endWeight: null,
      delta: null,
      trend: "no_data" as const,
    },
    currentCheckin: {
      id: "checkin-1",
      weekStart,
      weekEnd,
      energy: overrides?.energy ?? 4,
      adherencePercent: overrides?.adherencePercent ?? 80,
      blockers: overrides?.blockers ?? "Travel week",
      weightSnapshot: {
        unit: "lb" as const,
        entries: 0,
        startWeight: null,
        endWeight: null,
        delta: null,
        trend: "no_data" as const,
      },
      coachSummary: overrides?.coachSummary ?? null,
      summaryModel: overrides?.summaryModel ?? null,
      createdAt: "2026-02-25T00:00:00.000Z",
      updatedAt,
    },
    history: [
      {
        id: "checkin-1",
        weekStart,
        weekEnd,
        energy: overrides?.energy ?? 4,
        adherencePercent: overrides?.adherencePercent ?? 80,
        blockers: overrides?.blockers ?? "Travel week",
        weightSnapshot: {
          unit: "lb" as const,
          entries: 0,
          startWeight: null,
          endWeight: null,
          delta: null,
          trend: "no_data" as const,
        },
        coachSummary: overrides?.coachSummary ?? null,
        summaryModel: overrides?.summaryModel ?? null,
        createdAt: "2026-02-25T00:00:00.000Z",
        updatedAt,
      },
    ],
  };
}

function renderUseCoachCheckins(options?: {
  coach?: ActiveCoach | null;
  hydrated?: boolean;
  onTierRequired?: () => void;
}) {
  let current: HookValue | null = null;

  function HookHarness() {
    current = useCoachCheckins({
      coach: options?.coach ?? coach,
      hydrated: options?.hydrated ?? true,
      onTierRequired: options?.onTierRequired,
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
        throw new Error("Hook state not available yet");
      }
      return current;
    },
    unmount: () => act(() => renderer.unmount()),
  };
}

describe("useCoachCheckins", () => {
  beforeEach(() => {
    __resetCoachCheckinsCacheForTests();
    mocks.hydrateCoachCheckinsWorkflow.mockReset();
    mocks.submitCoachCheckinWorkflow.mockReset();
    mocks.publishCoachSyncEvent.mockReset();
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

  it("validates energy bounds before submitting", async () => {
    const hook = renderUseCoachCheckins();

    act(() => {
      hook.current.setEnergy(0);
    });

    let result: Awaited<ReturnType<HookValue["submitCheckin"]>> | null = null;
    await act(async () => {
      result = await hook.current.submitCheckin();
    });

    expect(result).toEqual({ saved: false });
    expect(hook.current.validationMessage).toBe("Energy must be a whole number from 1 to 5.");
    expect(mocks.submitCoachCheckinWorkflow).not.toHaveBeenCalled();

    hook.unmount();
  });

  it("guards final submit when current weight is out of range", async () => {
    const hook = renderUseCoachCheckins();

    act(() => {
      hook.current.updateV2Field("currentWeight", "20");
    });

    let result: Awaited<ReturnType<HookValue["submitCheckin"]>> | null = null;
    await act(async () => {
      result = await hook.current.submitCheckin();
    });

    expect(result).toEqual({ saved: false });
    expect(hook.current.validationMessage).toBe(
      "Current weight must be between 66.1 and 771.6 lb.",
    );
    expect(mocks.submitCoachCheckinWorkflow).not.toHaveBeenCalled();

    hook.unmount();
  });

  it("guards final submit when sleep average hours are invalid", async () => {
    const hook = renderUseCoachCheckins();

    act(() => {
      hook.current.updateV2Field("sleepAvgHours", "25");
    });

    let result: Awaited<ReturnType<HookValue["submitCheckin"]>> | null = null;
    await act(async () => {
      result = await hook.current.submitCheckin();
    });

    expect(result).toEqual({ saved: false });
    expect(hook.current.validationMessage).toBe(
      "Sleep average hours must be between 0 and 24.",
    );
    expect(mocks.submitCoachCheckinWorkflow).not.toHaveBeenCalled();

    hook.unmount();
  });

  it("allows submitting with no blockers", async () => {
    mocks.submitCoachCheckinWorkflow.mockResolvedValueOnce({
      status: "success",
      payload: buildNoDataPayload({
        blockers: "",
      }),
    });

    const hook = renderUseCoachCheckins();

    act(() => {
      hook.current.setEnergy(4);
      hook.current.setAdherencePercent("80");
      hook.current.setBlockers("   ");
    });

    await act(async () => {
      await hook.current.submitCheckin();
    });

    expect(mocks.submitCoachCheckinWorkflow).toHaveBeenCalledWith({
      coach,
      limit: 26,
      input: expect.objectContaining({
        energy: 4,
        adherencePercent: 80,
        blockers: "",
      }),
    });
    expect(hook.current.validationMessage).toBeNull();

    hook.unmount();
  });

  it("applies no-data snapshots and same-week resubmit summary updates from submit payloads", async () => {
    const weekStart = "2026-02-23";
    const weekEnd = "2026-03-01";
    const createdAt = "2026-02-25T00:00:00.000Z";
    const firstUpdatedAt = "2026-02-25T01:00:00.000Z";
    const secondUpdatedAt = "2026-02-25T02:00:00.000Z";

    const noDataSnapshot = {
      unit: "lb" as const,
      entries: 0,
      startWeight: null,
      endWeight: null,
      delta: null,
      trend: "no_data" as const,
    };

    const firstPayload = {
      threadId: "thread-1",
      weekStart,
      weekEnd,
      weightSnapshot: noDataSnapshot,
      currentCheckin: {
        id: "checkin-1",
        weekStart,
        weekEnd,
        energy: 4,
        adherencePercent: 80,
        blockers: "Travel week",
        weightSnapshot: noDataSnapshot,
        coachSummary:
          "Strong compliance for a travel week. Keep pre-packing protein snacks to reduce late-night misses.",
        summaryModel: "gpt-4o-mini",
        createdAt,
        updatedAt: firstUpdatedAt,
      },
      history: [
        {
          id: "checkin-1",
          weekStart,
          weekEnd,
          energy: 4,
          adherencePercent: 80,
          blockers: "Travel week",
          weightSnapshot: noDataSnapshot,
          coachSummary:
            "Strong compliance for a travel week. Keep pre-packing protein snacks to reduce late-night misses.",
          summaryModel: "gpt-4o-mini",
          createdAt,
          updatedAt: firstUpdatedAt,
        },
      ],
    };

    const secondPayload = {
      threadId: "thread-1",
      weekStart,
      weekEnd,
      weightSnapshot: noDataSnapshot,
      currentCheckin: {
        id: "checkin-1",
        weekStart,
        weekEnd,
        energy: 5,
        adherencePercent: 85,
        blockers: "Work travel",
        weightSnapshot: noDataSnapshot,
        coachSummary:
          "Energy improved and adherence rose this week. Lock one default travel dinner and one backup snack option for consistency.",
        summaryModel: "gpt-4o-mini",
        createdAt,
        updatedAt: secondUpdatedAt,
      },
      history: [
        {
          id: "checkin-1",
          weekStart,
          weekEnd,
          energy: 5,
          adherencePercent: 85,
          blockers: "Work travel",
          weightSnapshot: noDataSnapshot,
          coachSummary:
            "Energy improved and adherence rose this week. Lock one default travel dinner and one backup snack option for consistency.",
          summaryModel: "gpt-4o-mini",
          createdAt,
          updatedAt: secondUpdatedAt,
        },
      ],
    };

    mocks.submitCoachCheckinWorkflow
      .mockResolvedValueOnce({ status: "success", payload: firstPayload })
      .mockResolvedValueOnce({ status: "success", payload: secondPayload });

    const hook = renderUseCoachCheckins();

    act(() => {
      hook.current.setEnergy(4);
      hook.current.setAdherencePercent("80");
      hook.current.setBlockers("Travel week");
    });

    await act(async () => {
      await hook.current.submitCheckin();
    });

    expect(hook.current.weightSnapshot.trend).toBe("no_data");
    expect(hook.current.isEditingCurrentWeek).toBe(true);
    expect(hook.current.history).toHaveLength(1);
    expect(hook.current.history[0]?.id).toBe("checkin-1");

    act(() => {
      hook.current.setEnergy(5);
      hook.current.setAdherencePercent("85");
      hook.current.setBlockers("  Work travel  ");
    });

    await act(async () => {
      await hook.current.submitCheckin();
    });

    expect(hook.current.history).toHaveLength(1);
    expect(hook.current.history[0]?.energy).toBe(5);
    expect(hook.current.history[0]?.blockers).toBe("Work travel");
    expect(hook.current.history[0]?.coachSummary).toContain("Energy improved");
    expect(mocks.submitCoachCheckinWorkflow).toHaveBeenNthCalledWith(1, {
      coach,
      limit: 26,
      input: expect.objectContaining({
        energy: 4,
        adherencePercent: 80,
        blockers: "Travel week",
      }),
    });
    expect(mocks.submitCoachCheckinWorkflow).toHaveBeenNthCalledWith(2, {
      coach,
      limit: 26,
      input: expect.objectContaining({
        energy: 5,
        adherencePercent: 85,
        blockers: "Work travel",
      }),
    });

    hook.unmount();
  });

  it("invokes tier-required callback when submit is gated", async () => {
    const onTierRequired = vi.fn();
    mocks.submitCoachCheckinWorkflow.mockResolvedValueOnce({ status: "tier_required" });

    const hook = renderUseCoachCheckins({ onTierRequired });

    act(() => {
      hook.current.setEnergy(4);
      hook.current.setAdherencePercent("80");
      hook.current.setBlockers("Travel week");
    });

    let result: Awaited<ReturnType<HookValue["submitCheckin"]>> | null = null;
    await act(async () => {
      result = await hook.current.submitCheckin();
    });

    expect(result).toEqual({ saved: false });
    expect(onTierRequired).toHaveBeenCalledTimes(1);
    expect(hook.current.saving).toBe(false);

    hook.unmount();
  });

  it("keeps save successful when submit payload has no coach summary", async () => {
    const weekStart = "2026-02-23";
    const weekEnd = "2026-03-01";

    mocks.submitCoachCheckinWorkflow.mockResolvedValueOnce({
      status: "success",
      payload: {
        threadId: "thread-2",
        weekStart,
        weekEnd,
        weightSnapshot: {
          unit: "lb",
          entries: 0,
          startWeight: null,
          endWeight: null,
          delta: null,
          trend: "no_data",
        },
        currentCheckin: {
          id: "checkin-2",
          weekStart,
          weekEnd,
          energy: 3,
          adherencePercent: 72,
          blockers: "Stress eating",
          weightSnapshot: {
            unit: "lb",
            entries: 0,
            startWeight: null,
            endWeight: null,
            delta: null,
            trend: "no_data",
          },
          coachSummary: null,
          summaryModel: null,
          createdAt: "2026-02-25T00:00:00.000Z",
          updatedAt: "2026-02-25T01:00:00.000Z",
        },
        history: [
          {
            id: "checkin-2",
            weekStart,
            weekEnd,
            energy: 3,
            adherencePercent: 72,
            blockers: "Stress eating",
            weightSnapshot: {
              unit: "lb",
              entries: 0,
              startWeight: null,
              endWeight: null,
              delta: null,
              trend: "no_data",
            },
            coachSummary: null,
            summaryModel: null,
            createdAt: "2026-02-25T00:00:00.000Z",
            updatedAt: "2026-02-25T01:00:00.000Z",
          },
        ],
      },
    });

    const hook = renderUseCoachCheckins();

    act(() => {
      hook.current.setEnergy(3);
      hook.current.setAdherencePercent("72");
      hook.current.setBlockers("Stress eating");
    });

    let result: Awaited<ReturnType<HookValue["submitCheckin"]>> | null = null;
    await act(async () => {
      result = await hook.current.submitCheckin();
    });

    expect(result).toEqual({ saved: true });
    expect(hook.current.currentCheckin?.coachSummary).toBeNull();
    expect(hook.current.history[0]?.coachSummary).toBeNull();
    expect(hook.current.saveError).toBeNull();

    hook.unmount();
  });

  it("prevents duplicate submit while a submit is already in flight", async () => {
    let resolveSubmit:
      | ((value: Awaited<ReturnType<typeof mocks.submitCoachCheckinWorkflow>>) => void)
      | null = null;
    mocks.submitCoachCheckinWorkflow.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        })
    );

    const hook = renderUseCoachCheckins();

    act(() => {
      hook.current.setEnergy(4);
      hook.current.setAdherencePercent("80");
      hook.current.setBlockers("Travel week");
    });

    let firstSubmit: Promise<{ saved: boolean; error?: string }>;
    let secondSubmit: Promise<{ saved: boolean; error?: string }>;

    await act(async () => {
      firstSubmit = hook.current.submitCheckin();
      secondSubmit = hook.current.submitCheckin();
    });

    expect(mocks.submitCoachCheckinWorkflow).toHaveBeenCalledTimes(1);
    await expect(secondSubmit!).resolves.toEqual({ saved: false });

    await act(async () => {
      resolveSubmit?.({ status: "success", payload: buildNoDataPayload() });
      await firstSubmit!;
    });

    expect(hook.current.saving).toBe(false);

    hook.unmount();
  });

  it("ignores stale hydrate responses when a newer hydrate finishes first", async () => {
    let resolveFirst:
      | ((value: Awaited<ReturnType<typeof mocks.hydrateCoachCheckinsWorkflow>>) => void)
      | null = null;
    let resolveSecond:
      | ((value: Awaited<ReturnType<typeof mocks.hydrateCoachCheckinsWorkflow>>) => void)
      | null = null;

    mocks.hydrateCoachCheckinsWorkflow
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      );

    const hook = renderUseCoachCheckins();

    let firstHydrate: Promise<void>;
    let secondHydrate: Promise<void>;
    await act(async () => {
      firstHydrate = hook.current.hydrateCheckins();
      secondHydrate = hook.current.hydrateCheckins();
    });

    await act(async () => {
      resolveSecond?.({
        status: "success",
        payload: buildNoDataPayload({
          threadId: "thread-new",
          energy: 5,
          blockers: "Newest response",
        }),
      });
      await secondHydrate!;
    });

    await act(async () => {
      resolveFirst?.({
        status: "success",
        payload: buildNoDataPayload({
          threadId: "thread-old",
          energy: 2,
          blockers: "Older response",
        }),
      });
      await firstHydrate!;
    });

    expect(hook.current.threadId).toBe("thread-new");
    expect(hook.current.currentCheckin?.energy).toBe(5);
    expect(hook.current.currentCheckin?.blockers).toBe("Newest response");

    hook.unmount();
  });

  it("uses refreshing for non-blocking reloads after data exists", async () => {
    mocks.hydrateCoachCheckinsWorkflow.mockResolvedValueOnce({
      status: "success",
      payload: buildNoDataPayload(),
    });

    const hook = renderUseCoachCheckins();

    await act(async () => {
      await hook.current.hydrateCheckins();
    });

    let resolveRefresh:
      | ((value: Awaited<ReturnType<typeof mocks.hydrateCoachCheckinsWorkflow>>) => void)
      | null = null;
    mocks.hydrateCoachCheckinsWorkflow.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        })
    );

    await act(async () => {
      void hook.current.hydrateCheckins();
    });

    expect(hook.current.historyLoading).toBe(false);
    expect(hook.current.refreshing).toBe(true);

    await act(async () => {
      resolveRefresh?.({
        status: "success",
        payload: buildNoDataPayload({ threadId: "thread-refresh" }),
      });
    });

    expect(hook.current.refreshing).toBe(false);
    expect(hook.current.threadId).toBe("thread-refresh");

    hook.unmount();
  });

  it("shows and auto-dismisses save success feedback", async () => {
    vi.useFakeTimers();
    try {
      mocks.submitCoachCheckinWorkflow.mockResolvedValueOnce({
        status: "success",
        payload: buildNoDataPayload(),
      });

      const hook = renderUseCoachCheckins();

      act(() => {
        hook.current.setEnergy(4);
        hook.current.setAdherencePercent("80");
        hook.current.setBlockers("Travel week");
      });

      await act(async () => {
        await hook.current.submitCheckin();
      });

      expect(hook.current.saveSuccessMessage).toBe("Weekly check-in saved.");

      act(() => {
        vi.advanceTimersByTime(2200);
      });

      expect(hook.current.saveSuccessMessage).toBeNull();

      hook.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears review CTA state when nutrition draft is resolved", async () => {
    mocks.hydrateCoachCheckinsWorkflow.mockResolvedValueOnce({
      status: "success",
      payload: {
        ...buildNoDataPayload(),
        planUpdatedForReview: true,
      },
    });

    const hook = renderUseCoachCheckins();

    await act(async () => {
      await hook.current.hydrateCheckins();
    });
    expect(hook.current.planUpdatedForReview).toBe(true);

    act(() => {
      for (const listener of mocks.syncListeners) {
        listener({
          type: "nutrition_draft_resolved",
          resolution: "promoted",
          resolvedAt: Date.now(),
        });
      }
    });

    expect(hook.current.planUpdatedForReview).toBe(false);
    expect(hook.current.planUpdateError).toBeNull();

    hook.unmount();
  });
});
