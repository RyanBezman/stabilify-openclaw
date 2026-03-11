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
      authUserId: "user-1",
      specialization: "nutrition",
      coachIdentityKey: "nutrition:woman:strict",
      planUpdatedForReview: true,
      submittedAt: Date.now(),
    });

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();

    publishCoachSyncEvent({
      type: "nutrition_draft_resolved",
      authUserId: "user-1",
      specialization: "nutrition",
      coachIdentityKey: "nutrition:woman:strict",
      resolution: "promoted",
      resolvedAt: Date.now(),
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
