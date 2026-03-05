import type { ActiveCoach } from "../types";
import type { ChatMessage, CoachIntake, CoachPlan } from "../types/workspaceTypes";

export type CoachWorkspaceState = {
  activeCoach: ActiveCoach | null;
  activePlan: CoachPlan | null;
  draftPlan: CoachPlan | null;
  messages: ChatMessage[];
  intake: CoachIntake | null;
  updatedAt: number;
};
