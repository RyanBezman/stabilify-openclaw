import type { CoachWorkspaceResponse } from "./chatClient";

type InvokeCoachChat = (body: Record<string, unknown>) => Promise<CoachWorkspaceResponse>;

type WorkspaceActionBase = {
  invokeCoachChat: InvokeCoachChat;
  specialization: string;
  planType: string;
  coachIdentityPayload: Record<string, unknown>;
};

type GeneratePlanAction = WorkspaceActionBase & {
  intake: Record<string, unknown>;
};

export async function generatePlan({
  invokeCoachChat,
  specialization,
  planType,
  intake,
  coachIdentityPayload,
}: GeneratePlanAction) {
  return invokeCoachChat({
    action: "plan_generate",
    specialization,
    plan_type: planType,
    intake,
    ...coachIdentityPayload,
  });
}

type RevisePlanDaysAction = WorkspaceActionBase & {
  daysPerWeek: number;
};
export type NutritionPlanFeedbackDecision = "accept" | "not_now" | "ask_coach";

export async function revisePlanDays({
  invokeCoachChat,
  specialization,
  planType,
  daysPerWeek,
  coachIdentityPayload,
}: RevisePlanDaysAction) {
  return invokeCoachChat({
    action: "plan_revise_days",
    specialization,
    plan_type: planType,
    daysPerWeek,
    ...coachIdentityPayload,
  });
}

export async function promoteDraftPlan({
  invokeCoachChat,
  specialization,
  planType,
  coachIdentityPayload,
}: WorkspaceActionBase) {
  return invokeCoachChat({
    action: "plan_promote_draft",
    specialization,
    plan_type: planType,
    ...coachIdentityPayload,
  });
}

export async function discardDraftPlan({
  invokeCoachChat,
  specialization,
  planType,
  coachIdentityPayload,
}: WorkspaceActionBase) {
  return invokeCoachChat({
    action: "plan_discard_draft",
    specialization,
    plan_type: planType,
    ...coachIdentityPayload,
  });
}

type LogNutritionPlanFeedbackAction = WorkspaceActionBase & {
  decision: NutritionPlanFeedbackDecision;
  context?: string;
};

async function logNutritionPlanFeedback({
  invokeCoachChat,
  specialization,
  planType,
  coachIdentityPayload,
  decision,
  context = "checkin_review",
}: LogNutritionPlanFeedbackAction) {
  return invokeCoachChat({
    action: "plan_feedback_log",
    specialization,
    plan_type: planType,
    decision,
    context,
    ...coachIdentityPayload,
  });
}
