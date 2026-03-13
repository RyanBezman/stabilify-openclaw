import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetRelationshipSyncEventsForTests,
  publishRelationshipSyncEvent,
  subscribeRelationshipSyncEvents,
} from "./relationshipSyncEvents";

describe("relationshipSyncEvents", () => {
  afterEach(() => {
    __resetRelationshipSyncEventsForTests();
    vi.clearAllMocks();
  });

  it("delivers published events to subscribers and stops after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRelationshipSyncEvents(listener);

    publishRelationshipSyncEvent({
      type: "block_state_changed",
      targetUserId: "target-1",
      nextState: "blocked",
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "block_state_changed",
        targetUserId: "target-1",
        nextState: "blocked",
      }),
    );

    unsubscribe();

    publishRelationshipSyncEvent({
      type: "close_friend_removed",
      friendUserId: "friend-2",
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
