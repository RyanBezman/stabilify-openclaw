import type { ActiveCoach, CoachSpecialization } from "../types";

export function coachSyncIdentityKey(
  coach: Pick<ActiveCoach, "specialization" | "gender" | "personality"> | null | undefined
) {
  if (!coach) {
    return null;
  }
  return `${coach.specialization}:${coach.gender}:${coach.personality}`;
}

export type CoachSyncEvent =
  | {
      type: "checkin_submitted";
      authUserId: string;
      specialization: CoachSpecialization;
      coachIdentityKey: string;
      planUpdatedForReview: boolean;
      submittedAt: number;
    }
  | {
      type: "nutrition_draft_resolved";
      authUserId: string;
      specialization: "nutrition";
      coachIdentityKey: string;
      resolution: "promoted" | "discarded";
      resolvedAt: number;
    }
  | {
      type: "workspace_plan_changed";
      authUserId: string;
      specialization: CoachSpecialization;
      coachIdentityKey: string;
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
