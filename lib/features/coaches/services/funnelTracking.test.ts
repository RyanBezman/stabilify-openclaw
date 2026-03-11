import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  insert: vi.fn(),
  selectProfiles: vi.fn(),
  eqProfiles: vi.fn(),
  maybeSingleProfiles: vi.fn(),
  selectAnalytics: vi.fn(),
  eqAnalyticsUser: vi.fn(),
  eqAnalyticsIdempotency: vi.fn(),
  limitAnalytics: vi.fn(),
  maybeSingleAnalytics: vi.fn(),
}));

vi.mock("../../../supabase", () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
    from: vi.fn((table: string) => {
      if (table === "analytics_events") {
        return {
          insert: mocks.insert,
          select: mocks.selectAnalytics,
        };
      }

      if (table === "profiles") {
        return {
          select: mocks.selectProfiles,
        };
      }

      return {};
    }),
  },
}));

import {
  __resetCoachFunnelTrackingCacheForTests,
  trackCoachFunnelEvent,
} from "./funnelTracking";

describe("funnelTracking", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.insert.mockReset();
    mocks.selectProfiles.mockReset();
    mocks.eqProfiles.mockReset();
    mocks.maybeSingleProfiles.mockReset();
    mocks.selectAnalytics.mockReset();
    mocks.eqAnalyticsUser.mockReset();
    mocks.eqAnalyticsIdempotency.mockReset();
    mocks.limitAnalytics.mockReset();
    mocks.maybeSingleAnalytics.mockReset();
    __resetCoachFunnelTrackingCacheForTests();

    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
      error: null,
    });
    mocks.insert.mockResolvedValue({ error: null });
    mocks.maybeSingleProfiles.mockResolvedValue({
      data: {
        membership_tier: "pro",
      },
      error: null,
    });
    mocks.eqProfiles.mockReturnValue({
      maybeSingle: mocks.maybeSingleProfiles,
    });
    mocks.selectProfiles.mockReturnValue({
      eq: mocks.eqProfiles,
    });
    mocks.maybeSingleAnalytics.mockResolvedValue({
      data: null,
      error: null,
    });
    mocks.limitAnalytics.mockReturnValue({
      maybeSingle: mocks.maybeSingleAnalytics,
    });
    mocks.eqAnalyticsIdempotency.mockReturnValue({
      limit: mocks.limitAnalytics,
    });
    mocks.eqAnalyticsUser.mockReturnValue({
      eq: mocks.eqAnalyticsIdempotency,
    });
    mocks.selectAnalytics.mockReturnValue({
      eq: mocks.eqAnalyticsUser,
    });
  });

  it("skips duplicate idempotent coach funnel events before insert", async () => {
    mocks.maybeSingleAnalytics.mockResolvedValueOnce({
      data: {
        id: "event-1",
      },
      error: null,
    });

    await trackCoachFunnelEvent({
      eventName: "checkin_opened",
      coach: {
        specialization: "nutrition",
        gender: "woman",
        personality: "analyst",
      },
      userTier: "pro",
      weekStart: "2026-03-09",
    });

    expect(mocks.selectAnalytics).toHaveBeenCalledWith("id");
    expect(mocks.eqAnalyticsUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(mocks.eqAnalyticsIdempotency).toHaveBeenCalledWith(
      "idempotency_key",
      "checkin_opened:nutrition:woman:analyst:2026-03-09"
    );
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("uses plain insert when no idempotency key is available", async () => {
    await trackCoachFunnelEvent({
      eventName: "plan_decision_made",
      coach: {
        specialization: "nutrition",
        gender: "woman",
        personality: "analyst",
      },
      userTier: "pro",
      decision: "accept",
    });

    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: "plan_decision_made",
        idempotency_key: null,
      })
    );
    expect(mocks.selectAnalytics).not.toHaveBeenCalled();
  });
});
