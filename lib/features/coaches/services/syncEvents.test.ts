import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetCoachSyncEventsForTests,
  publishCoachSyncEvent,
  subscribeCoachSyncEvents,
} from "./syncEvents";

describe("syncEvents", () => {
  afterEach(() => {
    __resetCoachSyncEventsForTests();
    vi.clearAllMocks();
  });

  it("delivers events to active subscribers and stops after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCoachSyncEvents(listener);

    publishCoachSyncEvent({
      type: "checkin_submitted",
      specialization: "nutrition",
      planUpdatedForReview: true,
      submittedAt: Date.now(),
    });

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();

    publishCoachSyncEvent({
      type: "nutrition_draft_resolved",
      resolution: "promoted",
      resolvedAt: Date.now(),
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
