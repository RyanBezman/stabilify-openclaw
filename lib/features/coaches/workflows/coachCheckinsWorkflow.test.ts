import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchNutritionCheckins: vi.fn(),
  submitWeeklyCheckinV2: vi.fn(),
  isTierRestrictedCoachError: vi.fn(),
}));

vi.mock("../services/checkins", () => ({
  fetchNutritionCheckins: mocks.fetchNutritionCheckins,
  submitWeeklyCheckinV2: mocks.submitWeeklyCheckinV2,
}));

vi.mock("../services/chatClient", () => ({
  isTierRestrictedCoachError: mocks.isTierRestrictedCoachError,
}));

import {
  hydrateCoachCheckinsWorkflow,
  submitCoachCheckinWorkflow,
} from "./coachCheckinsWorkflow";

describe("coachCheckinsWorkflow", () => {
  beforeEach(() => {
    mocks.fetchNutritionCheckins.mockReset();
    mocks.submitWeeklyCheckinV2.mockReset();
    mocks.isTierRestrictedCoachError.mockReset();
    mocks.isTierRestrictedCoachError.mockReturnValue(false);
  });

  it("returns success payload for hydration", async () => {
    mocks.fetchNutritionCheckins.mockResolvedValue({
      threadId: "thread-1",
      weekStart: "2026-02-23",
      weekEnd: "2026-03-01",
      weightSnapshot: {
        unit: "lb",
        entries: 0,
        startWeight: null,
        endWeight: null,
        delta: null,
        trend: "no_data",
      },
      currentCheckin: null,
      history: [],
    });

    const result = await hydrateCoachCheckinsWorkflow({ limit: 12 });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.payload.threadId).toBe("thread-1");
    }
  });

  it("maps submit tier restriction to tier_required", async () => {
    const error = Object.assign(new Error("forbidden"), {
      status: 403,
      code: "TIER_REQUIRES_PRO",
    });
    mocks.submitWeeklyCheckinV2.mockRejectedValue(error);
    mocks.isTierRestrictedCoachError.mockReturnValue(true);

    const result = await submitCoachCheckinWorkflow({
      input: {
        energy: 4,
        adherencePercent: 90,
        blockers: "Late work nights",
      },
    });

    expect(result).toEqual({ status: "tier_required" });
  });

  it("maps non-tier submit failures into error state", async () => {
    mocks.submitWeeklyCheckinV2.mockRejectedValue(new Error("network"));

    const result = await submitCoachCheckinWorkflow({
      input: {
        energy: 3,
        adherencePercent: 70,
        blockers: "Busy schedule",
      },
    });

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.message).toBe("Couldn't complete the weekly check-in request. Please retry.");
      expect(result.error.code).toBeUndefined();
      expect(result.error.status).toBeUndefined();
    }
  });

  it("normalizes backend failures into safe user copy with diagnostics metadata", async () => {
    mocks.submitWeeklyCheckinV2.mockRejectedValue(
      Object.assign(new Error("Edge Function failed"), {
        status: 500,
        details: JSON.stringify({
          error: "db timeout",
          code: "CHECKIN_DATABASE",
        }),
      })
    );

    const result = await submitCoachCheckinWorkflow({
      input: {
        energy: 3,
        adherencePercent: 70,
        blockers: "Busy schedule",
      },
    });

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.message).toBe("Couldn't sync weekly check-ins right now. Please retry.");
      expect(result.error.status).toBe(500);
      expect(result.error.code).toBe("CHECKIN_DATABASE");
    }
  });

  it("maps stale coach selection failures to a clean coach reselect prompt", async () => {
    mocks.submitWeeklyCheckinV2.mockRejectedValue(
      new Error("No active nutrition coach could be resolved after re-saving your selection.")
    );

    const result = await submitCoachCheckinWorkflow({
      input: {
        energy: 4,
        adherencePercent: 81,
        blockers: "Travel",
      },
    });

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.message).toBe(
        "No active nutrition coach is selected. Please re-select your coach and retry."
      );
    }
  });
});
