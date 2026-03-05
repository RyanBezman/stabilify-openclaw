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
