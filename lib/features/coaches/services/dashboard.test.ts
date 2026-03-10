import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  invokeCoachChat: vi.fn(),
}));

vi.mock("./chatClient", () => ({
  invokeCoachChat: mocks.invokeCoachChat,
}));

import { hydrateCoachDashboard } from "./dashboard";

describe("hydrateCoachDashboard", () => {
  beforeEach(() => {
    mocks.invokeCoachChat.mockReset();
  });

  it("builds deterministic today fallback indicators without hydration or recovery rows", async () => {
    mocks.invokeCoachChat.mockResolvedValue({
      dashboard_snapshot: {
        training: {
          preview: "Upper A - 45 min",
        },
        nutrition: {
          targets_summary: "P160 C220 F65",
        },
      },
    });

    const snapshot = await hydrateCoachDashboard();

    expect(snapshot.today.statusIndicators).toEqual([
      "Workout: Upper A - 45 min",
      "Macros: P160 C220 F65",
    ]);
    expect(snapshot.today.statusIndicators.join(" ")).not.toContain("Hydration");
    expect(snapshot.today.statusIndicators.join(" ")).not.toContain("Recovery");
  });

  it("caps provided today indicators to two rows", async () => {
    mocks.invokeCoachChat.mockResolvedValue({
      dashboard_snapshot: {
        today: {
          status_indicators: [
            "Workout: Lower body",
            "Nutrition: P150 C210 F60",
            "Hydration: keep water intake steady",
            "Recovery: energy 4/5",
          ],
        },
      },
    });

    const snapshot = await hydrateCoachDashboard();

    expect(snapshot.today.statusIndicators).toEqual([
      "Workout: Lower body",
      "Macros: P150 C210 F60",
    ]);
  });

  it("uses stable today fallback text when plans are missing", async () => {
    mocks.invokeCoachChat.mockResolvedValue({
      dashboard_snapshot: {},
    });

    const snapshot = await hydrateCoachDashboard();

    expect(snapshot.today.statusIndicators).toEqual([
      "Workout: No training plan set",
      "Macros: No nutrition targets set",
    ]);
  });

  it("maps plan_accepted_this_week and ignores accepted_plan_rate in client model", async () => {
    mocks.invokeCoachChat.mockResolvedValue({
      dashboard_snapshot: {
        weekly_checkin: {
          next_due_label: "Sunday",
          is_due: false,
          streak: 3,
          adherence_score: 81,
          plan_accepted_this_week: false,
          accepted_plan_rate: 99,
          next_week_adherence_delta: 1.7,
          cta: "Preview last check-in",
        },
      },
    });

    const snapshot = await hydrateCoachDashboard();

    expect(snapshot.weeklyCheckin.planAcceptedThisWeek).toBe(false);
    expect(snapshot.weeklyCheckin.nextWeekAdherenceDelta).toBe(1.7);
    expect(Object.prototype.hasOwnProperty.call(snapshot.weeklyCheckin, "acceptedPlanRate")).toBe(false);
  });

  it("normalizes missing weekly decision to null", async () => {
    mocks.invokeCoachChat.mockResolvedValue({
      dashboard_snapshot: {
        weekly_checkin: {
          adherence_score: 70,
        },
      },
    });

    const snapshot = await hydrateCoachDashboard();

    expect(snapshot.weeklyCheckin.planAcceptedThisWeek).toBeNull();
  });
});
