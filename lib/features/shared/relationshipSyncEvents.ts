export type RelationshipFollowState =
  | "none"
  | "pending"
  | "accepted"
  | "rejected"
  | "blocked";

export type RelationshipSyncEvent =
  | {
      type: "follow_state_changed";
      targetUserId: string;
      nextState: RelationshipFollowState;
      emittedAt: number;
    }
  | {
      type: "block_state_changed";
      targetUserId: string;
      nextState: "blocked" | "none";
      emittedAt: number;
    }
  | {
      type: "close_friend_removed";
      friendUserId: string;
      emittedAt: number;
    };

type RelationshipSyncEventInput =
  | {
      type: "follow_state_changed";
      targetUserId: string;
      nextState: RelationshipFollowState;
    }
  | {
      type: "block_state_changed";
      targetUserId: string;
      nextState: "blocked" | "none";
    }
  | {
      type: "close_friend_removed";
      friendUserId: string;
    };

type Listener = (event: RelationshipSyncEvent) => void;

const listeners = new Set<Listener>();

function withTimestamp(event: RelationshipSyncEventInput): RelationshipSyncEvent {
  const emittedAt = Date.now();

  if (event.type === "follow_state_changed") {
    return {
      type: "follow_state_changed",
      targetUserId: event.targetUserId,
      nextState: event.nextState,
      emittedAt,
    };
  }

  if (event.type === "block_state_changed") {
    return {
      type: "block_state_changed",
      targetUserId: event.targetUserId,
      nextState: event.nextState,
      emittedAt,
    };
  }

  return {
    type: "close_friend_removed",
    friendUserId: event.friendUserId,
    emittedAt,
  };
}

export function publishRelationshipSyncEvent(event: RelationshipSyncEventInput): void {
  const nextEvent = withTimestamp(event);
  for (const listener of listeners) {
    listener(nextEvent);
  }
}

export function subscribeRelationshipSyncEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function __resetRelationshipSyncEventsForTests(): void {
  listeners.clear();
}
