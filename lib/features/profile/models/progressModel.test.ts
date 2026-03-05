import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardData } from "../../../data/dashboard";
import { formatShortDate } from "../../../utils/metrics";
import { buildProfileProgressModel } from "./progressModel";

describe("buildProfileProgressModel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns safe defaults when dashboard is missing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-24T12:00:00.000Z"));

    const model = buildProfileProgressModel(null);

    expect(model.unit).toBe("lb");
    expect(model.streakDays).toBe(0);
    expect(model.consistencyDays).toBe(0);
    expect(model.consistencyPercent).toBe(0);
    expect(model.trendPoints).toEqual([]);
    expect(model.verifiedGymSessions).toBe(0);
    expect(model.weeklyGymTarget).toBe(0);
    expect(model.todayGymSession).toBeNull();
    expect(model.gymWeekLabel).toBe("This week");
    expect(model.accolades).toHaveLength(4);
  });

  it("derives streak, consistency, trend, and gym progress from dashboard data", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-24T12:00:00.000Z"));

    const dashboard: DashboardData = {
      profile: {
        username: "ryan",
        displayName: "Ryan",
        bio: "",
        membershipTier: "pro",
        preferredUnit: "kg",
        timezone: "UTC",
        avatarPath: null,
        accountVisibility: "public",
        progressVisibility: "public",
        socialEnabled: true,
        autoSupportEnabled: false,
        autoSupportConsentAt: null,
        weighInShareVisibility: "followers",
        gymEventShareVisibility: "followers",
        postShareVisibility: "followers",
      },
      goal: null,
      routine: {
        weighInCadence: "daily",
        customCadence: null,
        reminderTime: null,
        gymProofEnabled: true,
        gymName: "Gym",
        gymSessionsTarget: 2,
        gymPlaceName: "Gym",
        gymLat: null,
        gymLng: null,
      },
      weighIns: [
        { id: "w1", weight: 79.1, unit: "kg", recordedAt: "", localDate: "2026-02-24" },
        { id: "w2", weight: 79.3, unit: "kg", recordedAt: "", localDate: "2026-02-23" },
        { id: "w3", weight: 79.7, unit: "kg", recordedAt: "", localDate: "2026-02-21" },
      ],
      gymSessions: [
        {
          id: "g1",
          sessionDate: "2026-02-24",
          status: "verified",
          statusReason: null,
          distanceMeters: 1200,
        },
        {
          id: "g2",
          sessionDate: "2026-02-23",
          status: "verified",
          statusReason: null,
          distanceMeters: 900,
        },
        {
          id: "g3",
          sessionDate: "2026-02-22",
          status: "verified",
          statusReason: null,
          distanceMeters: 800,
        },
      ],
      gymWeekStart: "2026-02-23",
      gymWeekEnd: "2026-03-01",
    };

    const model = buildProfileProgressModel(dashboard);

    expect(model.unit).toBe("kg");
    expect(model.timeZone).toBe("UTC");
    expect(model.streakDays).toBe(2);
    expect(model.consistencyDays).toBe(3);
    expect(model.consistencyTotalDays).toBe(30);
    expect(model.consistencyPercent).toBeCloseTo(0.1, 5);
    expect(model.trendPoints).toEqual([
      { weight: 79.7, localDate: "2026-02-21" },
      { weight: 79.3, localDate: "2026-02-23" },
      { weight: 79.1, localDate: "2026-02-24" },
    ]);
    expect(model.weeklyGymTarget).toBe(2);
    expect(model.verifiedGymSessions).toBe(2);
    expect(model.gymWeekLabel).toBe(`Week of ${formatShortDate("2026-02-23")}`);
    expect(model.todayGymSession).toEqual({
      status: "verified",
      statusReason: null,
      distanceMeters: 1200,
    });
    expect(model.accolades.find((item) => item.key === "gym")?.active).toBe(true);
    expect(model.accolades.find((item) => item.key === "streak")?.active).toBe(false);
  });
});
