import type { CoachWorkspaceState } from "../models/workspaceState";
import {
  discardDraftPlan as discardDraftPlanUseCase,
  generatePlan as generatePlanUseCase,
  promoteDraftPlan as promoteDraftPlanUseCase,
  revisePlanDays as revisePlanDaysUseCase,
} from "../services/workspaceUseCases";
import {
  isTierRestrictedCoachError,
  mapCoachMessages,
  type CoachWorkspaceResponse,
} from "../services/chatClient";
import { loadCoachState } from "../services/storage";
import type { ActiveCoach, CoachSpecialization } from "../types";
import type {
  ChatMessage,
  CoachIntake,
  CoachPlan,
  NutritionGoal,
} from "../types/workspaceTypes";

type InvokeCoachChat = (body: Record<string, unknown>) => Promise<CoachWorkspaceResponse>;

type MutationContext = {
  activePlan: CoachPlan | null;
  draftPlan: CoachPlan | null;
  intake: CoachIntake;
  threadId: string | null;
  specialization: CoachSpecialization;
  defaultIntake: CoachIntake;
};

type WorkflowErrorInfo = {
  message: string;
  status?: number;
  code?: string;
};

type WorkflowResultWithPayload<T> =
  | { status: "success"; payload: T }
  | { status: "tier_required" }
  | { status: "error"; error: WorkflowErrorInfo };

export type CoachWorkspaceMutationPayload = {
  threadId: string | null;
  messages: ChatMessage[];
  hasActivePlan: boolean;
  activePlan: CoachPlan | null;
  hasDraftPlan: boolean;
  draftPlan: CoachPlan | null;
  hasIntake: boolean;
  intake: CoachIntake | null;
  defaultNutritionGoal: NutritionGoal | null;
};

export type HydratedCoachWorkspaceCache = Pick<
  CoachWorkspaceState,
  "activePlan" | "draftPlan" | "messages"
> & {
  intake: CoachIntake;
};

type HydratedCoachWorkspacePayload = {
  remote: CoachWorkspaceMutationPayload;
};

type HydrateCoachWorkspaceWorkflowOptions = {
  coach: ActiveCoach | null;
  specialization: CoachSpecialization;
  hydrated: boolean;
  defaultIntake: CoachIntake;
  coachIdentityPayload: Record<string, unknown>;
  invokeCoachChat: InvokeCoachChat;
  onCachedState?: (state: HydratedCoachWorkspaceCache) => void;
  skipCachedState?: boolean;
};

type SendCoachMessageWorkflowOptions = {
  content: string;
  specialization: CoachSpecialization;
  planType: string;
  coachIdentityPayload: Record<string, unknown>;
  invokeCoachChat: InvokeCoachChat;
  currentActivePlan: CoachPlan | null;
  currentDraftPlan: CoachPlan | null;
  currentIntake: CoachIntake;
  currentThreadId: string | null;
  applyOptimisticMessage: (message: ChatMessage) => void;
  rollbackOptimisticMessage: (messageId: string) => void;
};

type GeneratePlanWorkflowOptions = {
  specialization: CoachSpecialization;
  planType: string;
  intake: Record<string, unknown>;
  coachIdentityPayload: Record<string, unknown>;
  invokeCoachChat: InvokeCoachChat;
  currentActivePlan: CoachPlan | null;
  currentDraftPlan: CoachPlan | null;
  currentIntake: CoachIntake;
  currentThreadId: string | null;
  defaultIntake: CoachIntake;
};

type RevisePlanWorkflowOptions = {
  specialization: CoachSpecialization;
  planType: string;
  daysPerWeek: number;
  coachIdentityPayload: Record<string, unknown>;
  invokeCoachChat: InvokeCoachChat;
  currentActivePlan: CoachPlan | null;
  currentDraftPlan: CoachPlan | null;
  currentIntake: CoachIntake;
  currentThreadId: string | null;
  defaultIntake: CoachIntake;
};

type DraftPlanMutationWorkflowOptions = {
  specialization: CoachSpecialization;
  planType: string;
  coachIdentityPayload: Record<string, unknown>;
  invokeCoachChat: InvokeCoachChat;
  currentActivePlan: CoachPlan | null;
  currentDraftPlan: CoachPlan | null;
  currentIntake: CoachIntake;
  currentThreadId: string | null;
  defaultIntake: CoachIntake;
};

function isNutritionGoal(value: unknown): value is NutritionGoal {
  return value === "lose" || value === "maintain" || value === "gain";
}

function toWorkflowErrorInfo(error: unknown): WorkflowErrorInfo {
  const err = error as Error & { status?: number; code?: string };
  return {
    message: String(err.message ?? err),
    status: err.status,
    code: err.code,
  };
}

function createMutationPayload(
  data: CoachWorkspaceResponse,
  {
    activePlan,
    draftPlan,
    intake,
    threadId,
    specialization,
    defaultIntake,
  }: MutationContext,
): CoachWorkspaceMutationPayload {
  const hasActivePlan = data.active_plan !== undefined;
  const hasDraftPlan = data.draft_plan !== undefined;
  const hasIntake = data.intake !== undefined;

  const nextIntake = hasIntake
    ? ((data.intake ?? defaultIntake) as CoachIntake)
    : intake;

  return {
    threadId: data.thread_id ?? threadId,
    messages: mapCoachMessages(data.messages),
    hasActivePlan,
    activePlan: hasActivePlan ? data.active_plan ?? null : activePlan,
    hasDraftPlan,
    draftPlan: hasDraftPlan ? data.draft_plan ?? null : draftPlan,
    hasIntake,
    intake: hasIntake ? nextIntake : intake,
    defaultNutritionGoal:
      specialization === "nutrition" && isNutritionGoal(data.default_nutrition_goal)
        ? data.default_nutrition_goal
        : null,
  };
}

async function runPlanMutationWorkflow(
  mutation: () => Promise<CoachWorkspaceResponse>,
  context: MutationContext,
): Promise<WorkflowResultWithPayload<CoachWorkspaceMutationPayload>> {
  try {
    const data = await mutation();
    return {
      status: "success",
      payload: createMutationPayload(data, context),
    };
  } catch (error) {
    if (isTierRestrictedCoachError(error)) {
      return { status: "tier_required" };
    }
    return {
      status: "error",
      error: toWorkflowErrorInfo(error),
    };
  }
}

export async function hydrateCoachWorkspaceWorkflow({
  coach,
  specialization,
  hydrated,
  defaultIntake,
  coachIdentityPayload,
  invokeCoachChat,
  onCachedState,
  skipCachedState = false,
}: HydrateCoachWorkspaceWorkflowOptions): Promise<WorkflowResultWithPayload<HydratedCoachWorkspacePayload> | { status: "skipped" }> {
  if (!coach || !hydrated) {
    return { status: "skipped" };
  }

  let cachedState: HydratedCoachWorkspaceCache | null = null;
  if (!skipCachedState) {
    const state = await loadCoachState(specialization);
    if (
      state.activeCoach &&
      state.activeCoach.gender === coach.gender &&
      state.activeCoach.personality === coach.personality
    ) {
      cachedState = {
        activePlan: state.activePlan,
        draftPlan: state.draftPlan,
        messages: state.messages,
        intake: (state.intake ?? defaultIntake) as CoachIntake,
      };
      onCachedState?.(cachedState);
    }
  }

  try {
    const data = await invokeCoachChat({
      action: "workspace",
      limit: 30,
      specialization,
      ...coachIdentityPayload,
    });

    const remote = createMutationPayload(data, {
      activePlan: cachedState?.activePlan ?? null,
      draftPlan: cachedState?.draftPlan ?? null,
      intake: cachedState?.intake ?? defaultIntake,
      threadId: null,
      specialization,
      defaultIntake,
    });

    return {
      status: "success",
      payload: { remote },
    };
  } catch (error) {
    if (isTierRestrictedCoachError(error)) {
      return { status: "tier_required" };
    }
    return {
      status: "error",
      error: toWorkflowErrorInfo(error),
    };
  }
}

export async function sendCoachMessageWorkflow({
  content,
  specialization,
  planType,
  coachIdentityPayload,
  invokeCoachChat,
  currentActivePlan,
  currentDraftPlan,
  currentIntake,
  currentThreadId,
  applyOptimisticMessage,
  rollbackOptimisticMessage,
}: SendCoachMessageWorkflowOptions): Promise<WorkflowResultWithPayload<CoachWorkspaceMutationPayload>> {
  const optimisticUser: ChatMessage = {
    id: `optimistic-u-${Date.now()}`,
    role: "user",
    content,
  };
  applyOptimisticMessage(optimisticUser);

  try {
    const data = await invokeCoachChat({
      action: "send",
      message: content,
      specialization,
      plan_type: planType,
      ...coachIdentityPayload,
    });

    return {
      status: "success",
      payload: createMutationPayload(data, {
        activePlan: currentActivePlan,
        draftPlan: currentDraftPlan,
        intake: currentIntake,
        threadId: currentThreadId,
        specialization,
        defaultIntake: currentIntake,
      }),
    };
  } catch (error) {
    rollbackOptimisticMessage(optimisticUser.id);
    if (isTierRestrictedCoachError(error)) {
      return { status: "tier_required" };
    }
    return {
      status: "error",
      error: toWorkflowErrorInfo(error),
    };
  }
}

export async function generatePlanWorkflow({
  specialization,
  planType,
  intake,
  coachIdentityPayload,
  invokeCoachChat,
  currentActivePlan,
  currentDraftPlan,
  currentIntake,
  currentThreadId,
  defaultIntake,
}: GeneratePlanWorkflowOptions): Promise<WorkflowResultWithPayload<CoachWorkspaceMutationPayload>> {
  return runPlanMutationWorkflow(
    () =>
      generatePlanUseCase({
        invokeCoachChat,
        specialization,
        planType,
        intake,
        coachIdentityPayload,
      }),
    {
      activePlan: currentActivePlan,
      draftPlan: currentDraftPlan,
      intake: currentIntake,
      threadId: currentThreadId,
      specialization,
      defaultIntake,
    },
  );
}

export async function revisePlanWorkflow({
  specialization,
  planType,
  daysPerWeek,
  coachIdentityPayload,
  invokeCoachChat,
  currentActivePlan,
  currentDraftPlan,
  currentIntake,
  currentThreadId,
  defaultIntake,
}: RevisePlanWorkflowOptions): Promise<WorkflowResultWithPayload<CoachWorkspaceMutationPayload>> {
  return runPlanMutationWorkflow(
    () =>
      revisePlanDaysUseCase({
        invokeCoachChat,
        specialization,
        planType,
        daysPerWeek,
        coachIdentityPayload,
      }),
    {
      activePlan: currentActivePlan,
      draftPlan: currentDraftPlan,
      intake: currentIntake,
      threadId: currentThreadId,
      specialization,
      defaultIntake,
    },
  );
}

export async function promoteDraftWorkflow({
  specialization,
  planType,
  coachIdentityPayload,
  invokeCoachChat,
  currentActivePlan,
  currentDraftPlan,
  currentIntake,
  currentThreadId,
  defaultIntake,
}: DraftPlanMutationWorkflowOptions): Promise<WorkflowResultWithPayload<CoachWorkspaceMutationPayload>> {
  return runPlanMutationWorkflow(
    () =>
      promoteDraftPlanUseCase({
        invokeCoachChat,
        specialization,
        planType,
        coachIdentityPayload,
      }),
    {
      activePlan: currentActivePlan,
      draftPlan: currentDraftPlan,
      intake: currentIntake,
      threadId: currentThreadId,
      specialization,
      defaultIntake,
    },
  );
}

export async function discardDraftWorkflow({
  specialization,
  planType,
  coachIdentityPayload,
  invokeCoachChat,
  currentActivePlan,
  currentDraftPlan,
  currentIntake,
  currentThreadId,
  defaultIntake,
}: DraftPlanMutationWorkflowOptions): Promise<WorkflowResultWithPayload<CoachWorkspaceMutationPayload>> {
  return runPlanMutationWorkflow(
    () =>
      discardDraftPlanUseCase({
        invokeCoachChat,
        specialization,
        planType,
        coachIdentityPayload,
      }),
    {
      activePlan: currentActivePlan,
      draftPlan: currentDraftPlan,
      intake: currentIntake,
      threadId: currentThreadId,
      specialization,
      defaultIntake,
    },
  );
}
