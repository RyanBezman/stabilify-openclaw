import type { CoachSpecialization } from "../types";

export type CoachSyncEvent =
  | {
      type: "checkin_submitted";
      specialization: CoachSpecialization;
      planUpdatedForReview: boolean;
      submittedAt: number;
    }
  | {
      type: "nutrition_draft_resolved";
      resolution: "promoted" | "discarded";
      resolvedAt: number;
    }
  | {
      type: "workspace_plan_changed";
      specialization: CoachSpecialization;
      changedAt: number;
    };

type Listener = (event: CoachSyncEvent) => void;

const listeners = new Set<Listener>();

export function publishCoachSyncEvent(event: CoachSyncEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}

export function subscribeCoachSyncEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function __resetCoachSyncEventsForTests(): void {
  listeners.clear();
}
