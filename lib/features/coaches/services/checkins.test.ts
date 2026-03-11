import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveCoach } from "../types";

const mocks = vi.hoisted(() => ({
  invokeCoachChat: vi.fn(),
  setActiveCoachOnServer: vi.fn(),
}));

vi.mock("./chatClient", () => ({
  invokeCoachChat: mocks.invokeCoachChat,
}));

vi.mock("./api", () => ({
  setActiveCoachOnServer: mocks.setActiveCoachOnServer,
}));

import {
  computeAdherenceScore,
  fetchNutritionCheckins,
  normalizeWeeklyCheckinInputV2,
  submitNutritionCheckin,
} from "./checkins";

const coach: ActiveCoach = {
  specialization: "nutrition",
  gender: "woman",
  personality: "strict",
  displayName: "Ruth",
  tagline: "Direct and clear",
};

describe("checkins service", () => {
  beforeEach(() => {
    mocks.invokeCoachChat.mockReset();
    mocks.setActiveCoachOnServer.mockReset();
    mocks.setActiveCoachOnServer.mockResolvedValue({ data: { ok: true } });
  });

  it("maps check-in history payload into app-friendly shape", async () => {
    mocks.invokeCoachChat.mockResolvedValue({
      thread_id: "thread-1",
      checkin_week_start: "2026-02-23",
      checkin_week_end: "2026-03-01",
      checkin_weight_snapshot: {
        unit: "lb",
        entries: 4,
        startWeight: 180,
        endWeight: 178.8,
        delta: -1.2,
        trend: "down",
      },
      plan_updated_for_review: true,
      checkin_current: {
        id: "checkin-1",
        week_start: "2026-02-23",
        week_end: "2026-03-01",
        energy: 4,
        adherence_percent: 88,
        blockers: "Weekend events",
        weight_snapshot: {
          unit: "lb",
          entries: 4,
          startWeight: 180,
          endWeight: 178.8,
          delta: -1.2,
          trend: "down",
        },
        coach_summary: null,
        summary_model: null,
        created_at: "2026-02-25T00:00:00.000Z",
        updated_at: "2026-02-25T01:00:00.000Z",
      },
      checkin_history: [
        {
          id: "checkin-1",
          week_start: "2026-02-23",
          week_end: "2026-03-01",
          energy: 4,
          adherence_percent: 88,
          blockers: "Weekend events",
          weight_snapshot: {
            unit: "lb",
            entries: 4,
            startWeight: 180,
            endWeight: 178.8,
            delta: -1.2,
            trend: "down",
          },
          coach_summary: null,
          summary_model: null,
          created_at: "2026-02-25T00:00:00.000Z",
          updated_at: "2026-02-25T01:00:00.000Z",
        },
      ],
    });

    const payload = await fetchNutritionCheckins({ coach, limit: 26 });

    expect(mocks.invokeCoachChat).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "checkin_history",
        specialization: "nutrition",
        limit: 26,
        coach_gender: "woman",
        coach_personality: "strict",
      })
    );

    expect(payload).toEqual({
      threadId: "thread-1",
      weekStart: "2026-02-23",
      weekEnd: "2026-03-01",
      weightSnapshot: {
        unit: "lb",
        entries: 4,
        startWeight: 180,
        endWeight: 178.8,
        delta: -1.2,
        trend: "down",
      },
      currentCheckin: {
        id: "checkin-1",
        weekStart: "2026-02-23",
        weekEnd: "2026-03-01",
        energy: 4,
        adherencePercent: 88,
        blockers: "Weekend events",
        weightSnapshot: {
          unit: "lb",
          entries: 4,
          startWeight: 180,
          endWeight: 178.8,
          delta: -1.2,
          trend: "down",
        },
        coachSummary: null,
        summaryModel: null,
        createdAt: "2026-02-25T00:00:00.000Z",
        updatedAt: "2026-02-25T01:00:00.000Z",
      },
      planUpdatedForReview: true,
      history: [
        {
          id: "checkin-1",
          weekStart: "2026-02-23",
          weekEnd: "2026-03-01",
          energy: 4,
          adherencePercent: 88,
          blockers: "Weekend events",
          weightSnapshot: {
            unit: "lb",
            entries: 4,
            startWeight: 180,
            endWeight: 178.8,
            delta: -1.2,
            trend: "down",
          },
          coachSummary: null,
          summaryModel: null,
          createdAt: "2026-02-25T00:00:00.000Z",
          updatedAt: "2026-02-25T01:00:00.000Z",
        },
      ],
    });
  });

  it("sends check-in submit payload with snake_case adherence", async () => {
    mocks.invokeCoachChat.mockResolvedValue({
      checkin_week_start: "2026-02-23",
      checkin_week_end: "2026-03-01",
      checkin_weight_snapshot: {
        unit: "lb",
        entries: 0,
        startWeight: null,
        endWeight: null,
        delta: null,
        trend: "no_data",
      },
      checkin_current: null,
      checkin_history: [],
    });

    await submitNutritionCheckin(
      {
        energy: 5,
        adherencePercent: 92,
        blockers: "Travel week",
      },
      { coach }
    );

    expect(mocks.invokeCoachChat).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "checkin_submit",
        specialization: "nutrition",
        checkin: {
          energy: 5,
          adherence_percent: 92,
          blockers: "Travel week",
        },
        coach_gender: "woman",
        coach_personality: "strict",
      })
    );
  });

  it("returns generated coach summary from submit payload", async () => {
    mocks.invokeCoachChat.mockResolvedValue({
      thread_id: "thread-2",
      checkin_week_start: "2026-02-23",
      checkin_week_end: "2026-03-01",
      checkin_weight_snapshot: {
        unit: "lb",
        entries: 4,
        startWeight: 181.2,
        endWeight: 180.4,
        delta: -0.8,
        trend: "down",
      },
      checkin_current: {
        id: "checkin-2",
        week_start: "2026-02-23",
        week_end: "2026-03-01",
        energy: 4,
        adherence_percent: 87,
        blockers: "Late dinners on travel days",
        weight_snapshot: {
          unit: "lb",
          entries: 4,
          startWeight: 181.2,
          endWeight: 180.4,
          delta: -0.8,
          trend: "down",
        },
        coach_summary:
          "You stayed consistent and kept weight trending down despite travel. Keep pre-planning late dinner options next week.",
        summary_model: "gpt-4o-mini",
        created_at: "2026-02-25T00:00:00.000Z",
        updated_at: "2026-02-25T02:00:00.000Z",
      },
      checkin_history: [
        {
          id: "checkin-2",
          week_start: "2026-02-23",
          week_end: "2026-03-01",
          energy: 4,
          adherence_percent: 87,
          blockers: "Late dinners on travel days",
          weight_snapshot: {
            unit: "lb",
            entries: 4,
            startWeight: 181.2,
            endWeight: 180.4,
            delta: -0.8,
            trend: "down",
          },
          coach_summary:
            "You stayed consistent and kept weight trending down despite travel. Keep pre-planning late dinner options next week.",
          summary_model: "gpt-4o-mini",
          created_at: "2026-02-25T00:00:00.000Z",
          updated_at: "2026-02-25T02:00:00.000Z",
        },
      ],
    });

    const payload = await submitNutritionCheckin(
      {
        energy: 4,
        adherencePercent: 87,
        blockers: "Late dinners on travel days",
      },
      { coach }
    );

    expect(payload.currentCheckin?.coachSummary).toContain("weight trending down");
    expect(payload.currentCheckin?.summaryModel).toBe("gpt-4o-mini");
    expect(payload.history[0]?.coachSummary).toBe(payload.currentCheckin?.coachSummary ?? null);
  });

  it("keeps submit successful when summary generation is unavailable", async () => {
    mocks.invokeCoachChat.mockResolvedValue({
      thread_id: "thread-3",
      checkin_week_start: "2026-02-23",
      checkin_week_end: "2026-03-01",
      checkin_weight_snapshot: {
        unit: "lb",
        entries: 2,
        startWeight: 183.3,
        endWeight: 183.1,
        delta: -0.2,
        trend: "flat",
      },
      checkin_current: {
        id: "checkin-3",
        week_start: "2026-02-23",
        week_end: "2026-03-01",
        energy: 3,
        adherence_percent: 72,
        blockers: "Busy work week",
        weight_snapshot: {
          unit: "lb",
          entries: 2,
          startWeight: 183.3,
          endWeight: 183.1,
          delta: -0.2,
          trend: "flat",
        },
        coach_summary: null,
        summary_model: null,
        created_at: "2026-02-25T00:00:00.000Z",
        updated_at: "2026-02-25T03:00:00.000Z",
      },
      checkin_history: [
        {
          id: "checkin-3",
          week_start: "2026-02-23",
          week_end: "2026-03-01",
          energy: 3,
          adherence_percent: 72,
          blockers: "Busy work week",
          weight_snapshot: {
            unit: "lb",
            entries: 2,
            startWeight: 183.3,
            endWeight: 183.1,
            delta: -0.2,
            trend: "flat",
          },
          coach_summary: null,
          summary_model: null,
          created_at: "2026-02-25T00:00:00.000Z",
          updated_at: "2026-02-25T03:00:00.000Z",
        },
      ],
    });

    const payload = await submitNutritionCheckin(
      {
        energy: 3,
        adherencePercent: 72,
        blockers: "Busy work week",
      },
      { coach }
    );

    expect(payload.threadId).toBe("thread-3");
    expect(payload.currentCheckin?.id).toBe("checkin-3");
    expect(payload.currentCheckin?.coachSummary).toBeNull();
    expect(payload.currentCheckin?.summaryModel).toBeNull();
    expect(payload.history).toHaveLength(1);
    expect(payload.history[0]?.id).toBe("checkin-3");
  });

  it("maps malformed payloads without throwing", async () => {
    mocks.invokeCoachChat.mockResolvedValue({
      thread_id: "thread-malformed",
      checkin_weight_snapshot: {
        unit: "stone",
        entries: -2,
        startWeight: "n/a",
        endWeight: 179.5,
        delta: "bad",
        trend: "unknown",
      },
      checkin_current: "not-an-object",
      checkin_history: [
        null,
        {
          id: null,
          week_start: " 2026-02-23 ",
          week_end: undefined,
          energy: 9,
          adherence_percent: -4,
          blockers: "   ",
          weight_snapshot: {
            unit: "kg",
            entries: "five",
            startWeight: 80.2,
            endWeight: 79.8,
            delta: -0.4,
            trend: "down",
          },
          coach_summary: "  Strong week  ",
          summary_model: "   ",
          created_at: 123,
          updated_at: 456,
        },
      ],
    });

    const payload = await fetchNutritionCheckins({ coach, limit: 26 });

    expect(payload.threadId).toBe("thread-malformed");
    expect(payload.currentCheckin).toBeNull();
    expect(payload.weightSnapshot).toEqual({
      unit: "lb",
      entries: 0,
      startWeight: null,
      endWeight: 179.5,
      delta: null,
      trend: "no_data",
    });
    expect(payload.history).toEqual([
      {
        id: "checkin-history-1",
        weekStart: "2026-02-23",
        weekEnd: "",
        energy: 5,
        adherencePercent: 0,
        blockers: "",
        weightSnapshot: {
          unit: "kg",
          entries: 0,
          startWeight: 80.2,
          endWeight: 79.8,
          delta: -0.4,
          trend: "down",
        },
        coachSummary: "Strong week",
        summaryModel: null,
        createdAt: "",
        updatedAt: "",
      },
    ]);
    expect(payload.weekStart).toBe("2026-02-23");
    expect(payload.weekEnd).toBe("");
  });

  it("repairs stale coach selection and retries once", async () => {
    mocks.invokeCoachChat
      .mockRejectedValueOnce(new Error("No active coach selected."))
      .mockResolvedValueOnce({
        thread_id: "thread-retry",
        checkin_week_start: "2026-02-23",
        checkin_week_end: "2026-03-01",
        checkin_weight_snapshot: {
          unit: "lb",
          entries: 0,
          startWeight: null,
          endWeight: null,
          delta: null,
          trend: "no_data",
        },
        checkin_current: null,
        checkin_history: [],
      });

    const payload = await fetchNutritionCheckins({
      authUserId: "user-1",
      coach,
      limit: 26,
    });

    expect(payload.threadId).toBe("thread-retry");
    expect(mocks.invokeCoachChat).toHaveBeenCalledTimes(2);
    expect(mocks.setActiveCoachOnServer).toHaveBeenCalledWith("user-1", "nutrition", coach);
  });

  it("repairs stale coach selection during submit using the request auth user id", async () => {
    mocks.invokeCoachChat
      .mockRejectedValueOnce(new Error("No active coach selected."))
      .mockResolvedValueOnce({
        thread_id: "thread-submit-retry",
        checkin_week_start: "2026-02-23",
        checkin_week_end: "2026-03-01",
        checkin_weight_snapshot: {
          unit: "lb",
          entries: 0,
          startWeight: null,
          endWeight: null,
          delta: null,
          trend: "no_data",
        },
        checkin_current: null,
        checkin_history: [],
      });

    const payload = await submitNutritionCheckin(
      {
        energy: 4,
        adherencePercent: 85,
        blockers: "Travel week",
      },
      {
        authUserId: "user-1",
        coach,
        limit: 26,
      }
    );

    expect(payload.threadId).toBe("thread-submit-retry");
    expect(mocks.invokeCoachChat).toHaveBeenCalledTimes(2);
    expect(mocks.setActiveCoachOnServer).toHaveBeenCalledWith("user-1", "nutrition", coach);
    expect(mocks.invokeCoachChat).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: "checkin_submit",
        specialization: "nutrition",
        coach_gender: "woman",
        coach_personality: "strict",
      })
    );
  });

  it("computes deterministic adherence scores bounded to 0-100", () => {
    const first = computeAdherenceScore({
      adherencePercent: 88,
      subjective: "high",
      energyRating: 4,
      recoveryRating: 4,
      sleepAvgHours: 7.5,
      sleepQuality: 4,
      stressLevel: 2,
    });
    const second = computeAdherenceScore({
      adherencePercent: 88,
      subjective: "high",
      energyRating: 4,
      recoveryRating: 4,
      sleepAvgHours: 7.5,
      sleepQuality: 4,
      stressLevel: 2,
    });
    const boundedLow = computeAdherenceScore({
      adherencePercent: -500,
      energyRating: -1,
      recoveryRating: -1,
      sleepAvgHours: -2,
      sleepQuality: -1,
      stressLevel: 99,
    });
    const boundedHigh = computeAdherenceScore({
      adherencePercent: 500,
      energyRating: 99,
      recoveryRating: 99,
      sleepAvgHours: 99,
      sleepQuality: 99,
      stressLevel: -99,
    });

    expect(first).toBe(second);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThanOrEqual(100);
    expect(boundedLow).toBeGreaterThanOrEqual(0);
    expect(boundedLow).toBeLessThanOrEqual(100);
    expect(boundedHigh).toBeGreaterThanOrEqual(0);
    expect(boundedHigh).toBeLessThanOrEqual(100);
  });

  it("normalizes weekly check-in v2 payload fields", () => {
    const normalized = normalizeWeeklyCheckinInputV2({
      energy: 6,
      adherencePercent: 120,
      blockers: "  Travel week  ",
      currentWeightKg: 81.26,
      waistCm: null,
      trainingDifficulty: "too_hard",
      sleepAvgHours: 7.25,
      injuryPain: {
        hasPain: true,
        details: "  Knee pain  ",
        redFlags: false,
      },
      nutritionAdherenceSubjective: "medium",
      foodDigestionNotes: "  Bloated after larger dinners  ",
    });

    expect(normalized).toEqual(
      expect.objectContaining({
        energy: 5,
        adherencePercent: 100,
        blockers: "Travel week",
        currentWeightKg: 81.3,
        waistCm: null,
        trainingDifficulty: "too_hard",
        sleepAvgHours: 7.3,
        nutritionAdherenceSubjective: "medium",
        foodDigestionNotes: "Bloated after larger dinners",
      })
    );
    expect(normalized.injuryPain).toEqual({
      hasPain: true,
      details: "Knee pain",
      redFlags: false,
    });
  });

  it("round-trips digestion notes from payloads and submit requests", async () => {
    mocks.invokeCoachChat
      .mockResolvedValueOnce({
        checkin_week_start: "2026-02-23",
        checkin_week_end: "2026-03-01",
        checkin_weight_snapshot: {
          unit: "lb",
          entries: 0,
          startWeight: null,
          endWeight: null,
          delta: null,
          trend: "no_data",
        },
        checkin_current: null,
        checkin_history: [],
      })
      .mockResolvedValueOnce({
        thread_id: "thread-digestion",
        checkin_week_start: "2026-02-23",
        checkin_week_end: "2026-03-01",
        checkin_weight_snapshot: {
          unit: "lb",
          entries: 1,
          startWeight: 180,
          endWeight: 179.2,
          delta: -0.8,
          trend: "down",
        },
        checkin_current: {
          id: "checkin-digestion",
          week_start: "2026-02-23",
          week_end: "2026-03-01",
          energy: 4,
          adherence_percent: 88,
          blockers: "Travel week",
          weight_snapshot: {
            unit: "lb",
            entries: 1,
            startWeight: 180,
            endWeight: 179.2,
            delta: -0.8,
            trend: "down",
          },
          checkin_json: {
            timestamp: "2026-02-26T12:00:00.000Z",
            currentWeightKg: 81.3,
            progressPhotoPrompted: false,
            strengthPRs: "",
            consistencyNotes: "Stayed on track",
            bodyCompChanges: "",
            trainingDifficulty: "right",
            nutritionAdherencePercent: 88,
            nutritionAdherenceSubjective: "medium",
            appetiteCravings: "Late-night sweets were tough.",
            foodDigestionNotes: "Bloated after larger dinners.",
            energyRating: 4,
            recoveryRating: 4,
            sleepAvgHours: 7.5,
            sleepQuality: 4,
            stressLevel: 2,
            scheduleConstraintsNextWeek: "",
            injuryPain: {
              hasPain: false,
              details: "",
              redFlags: false,
            },
            computedAdherenceScore: 86,
            linkedPlanVersion: {
              workoutVersion: null,
              nutritionVersion: 3,
            },
          },
          created_at: "2026-02-26T12:00:00.000Z",
          updated_at: "2026-02-26T12:30:00.000Z",
        },
        checkin_history: [],
      });

    await submitNutritionCheckin(
      {
        energy: 4,
        adherencePercent: 88,
        blockers: "Travel week",
        currentWeightKg: 81.3,
        progressPhotoPrompted: false,
        strengthPRs: "",
        consistencyNotes: "Stayed on track",
        bodyCompChanges: "",
        trainingDifficulty: "right",
        nutritionAdherencePercent: 88,
        nutritionAdherenceSubjective: "medium",
        appetiteCravings: "Late-night sweets were tough.",
        foodDigestionNotes: "Bloated after larger dinners.",
        energyRating: 4,
        recoveryRating: 4,
        sleepAvgHours: 7.5,
        sleepQuality: 4,
        stressLevel: 2,
        scheduleConstraintsNextWeek: "",
        injuryPain: {
          hasPain: false,
          details: "",
          redFlags: false,
        },
        computedAdherenceScore: 86,
      },
      { coach },
    );

    expect(mocks.invokeCoachChat).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: "checkin_submit",
        checkin: expect.objectContaining({
          foodDigestionNotes: "Bloated after larger dinners.",
        }),
      }),
    );

    const payload = await fetchNutritionCheckins({ coach, limit: 26 });

    expect(payload.currentCheckin?.checkinArtifact?.foodDigestionNotes).toBe(
      "Bloated after larger dinners.",
    );
  });
});
