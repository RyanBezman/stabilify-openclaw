import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ScrollView, TextInput } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import useAssistantReveal from "../../../../components/chat/useAssistantReveal";
import { setActiveCoachOnServer } from "../services/api";
import { invokeCoachChat } from "../services/chatClient";
import { trackPlanDecisionMadeEvent } from "../services/funnelTracking";
import { saveCoachState } from "../services/storage";
import { publishCoachSyncEvent } from "../services/syncEvents";
import type { CoachWorkspaceState } from "../models/workspaceState";
import {
  discardDraftWorkflow,
  generatePlanWorkflow,
  hydrateCoachWorkspaceWorkflow,
  promoteDraftWorkflow,
  revisePlanWorkflow,
  sendCoachMessageWorkflow,
  type CoachWorkspaceMutationPayload,
} from "../workflows";
import { fetchCurrentUserId } from "../../auth";
import {
  deriveSurfaceLoadState,
  isAsyncWorkflowBusy,
} from "../../shared";
import type { UseCoachWorkspaceOptions } from "../types/screen";
import {
  coachAsyncReducer,
  initialCoachAsyncState,
} from "../models/workspaceAsyncState";
import {
  defaultIntake,
  defaultNutritionIntake,
  isNutritionIntake,
  isNutritionPlan,
  isWorkoutIntake,
  isWorkoutPlan,
  normalizeNutritionIntake,
  sleep,
} from "../models/workspaceHelpers";
import { logCoachRequestDiagnostics } from "../models/devDiagnostics";
import type {
  ChatMessage,
  CoachIntake,
  CoachPlan,
  NutritionGoal,
  NutritionIntake,
  PlanStatus,
  WorkspaceTab,
  WorkoutIntake,
} from "../types/workspaceTypes";

export function useCoachWorkspace({
  coach,
  specialization,
  hydrated,
  initialTab = "plan",
  openIntakeOnMount = false,
  openDraftOnMount = false,
  requirePlanFeedbackChoice = false,
  feedbackContext = "checkin_review",
  prefill,
  userTier,
  onTierRequired,
}: UseCoachWorkspaceOptions) {
  const clampDays = useCallback(
    (value: number) => Math.max(1, Math.min(7, Math.round(value))),
    []
  );

  const [tab, setTab] = useState<WorkspaceTab>(initialTab);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<CoachPlan | null>(null);
  const [draftPlan, setDraftPlan] = useState<CoachPlan | null>(null);
  const [showDraftInPlan, setShowDraftInPlan] = useState(false);
  const [showIntake, setShowIntake] = useState(false);
  const [requiresPlanFeedbackChoice, setRequiresPlanFeedbackChoice] = useState(
    specialization === "nutrition" && requirePlanFeedbackChoice
  );
  const [feedbackLogging, setFeedbackLogging] = useState(false);
  const [showDaysRevision, setShowDaysRevision] = useState(false);
  const [pendingDaysPerWeek, setPendingDaysPerWeek] = useState(4);
  const [intakeStep, setIntakeStep] = useState<1 | 2 | 3>(1);
  const [intake, setIntake] = useState<CoachIntake>(
    specialization === "nutrition" ? defaultNutritionIntake : defaultIntake
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [asyncState, dispatchAsync] = useReducer(coachAsyncReducer, initialCoachAsyncState);
  const [historyChecked, setHistoryChecked] = useState(false);
  const [workspaceSeeded, setWorkspaceSeeded] = useState(false);
  const [planApiUnavailable, setPlanApiUnavailable] = useState(false);
  const [planStage, setPlanStage] = useState<"idle" | "sending" | "modeling" | "persisting" | "done">("idle");
  const [planLoadingAction, setPlanLoadingAction] = useState<
    "generate" | "revise_days" | "promote" | "discard" | null
  >(null);
  const [planSuccessChip, setPlanSuccessChip] = useState<string | null>(null);
  const [defaultNutritionGoal, setDefaultNutritionGoal] = useState<NutritionGoal>("maintain");
  const chipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openIntakeHandledRef = useRef(false);
  const openDraftHandledRef = useRef(false);
  const prefillHandledRef = useRef(false);
  const skipCachedSeedForDraftOpenRef = useRef(Boolean(openDraftOnMount));
  const hydrateRequestIdRef = useRef(0);
  const hydrateWorkspaceRef = useRef<() => Promise<void>>(async () => {});
  const hasHandledInitialFocusRef = useRef(false);
  const workspaceRequestInFlightRef = useRef(false);

  const [composerHeight, setComposerHeight] = useState(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [draft, setDraft] = useState("");
  const lastSendRef = useRef<string | null>(null);
  const chatScrollRef = useRef<ScrollView | null>(null);
  const composerRef = useRef<TextInput | null>(null);
  const isAtBottomRef = useRef(true);

  const headerTitle = coach ? coach.displayName : "Coach";
  const isWorkout = specialization === "workout";
  const planType = specialization;
  const coachIdentityPayload = useMemo(
    () =>
      coach
        ? {
            coach_gender: coach.gender,
            coach_personality: coach.personality,
          }
        : {},
    [coach?.gender, coach?.personality]
  );

  const hasAnyPlan = Boolean(activePlan || draftPlan);
  const displayedPlan = useMemo(() => {
    if (showDraftInPlan && draftPlan) return draftPlan;
    if (!activePlan && draftPlan) return draftPlan;
    return activePlan;
  }, [activePlan, draftPlan, showDraftInPlan]);

  const displayedPlanKind: "current" | "new" | "none" = useMemo(() => {
    if (!displayedPlan) return "none";
    if (activePlan && displayedPlan === activePlan) return "current";
    return "new";
  }, [activePlan, displayedPlan]);

  const planBadge = useMemo<PlanStatus>(() => {
    if (activePlan) return "active";
    if (draftPlan) return "draft";
    return "none";
  }, [activePlan, draftPlan]);

  const hasToggle = Boolean(activePlan && draftPlan);
  const displayedWorkoutPlan = isWorkoutPlan(displayedPlan) ? displayedPlan : null;
  const displayedNutritionPlan = isNutritionPlan(displayedPlan) ? displayedPlan : null;
  const workoutActivePlan = isWorkoutPlan(activePlan) ? activePlan : null;
  const workoutDraftPlan = isWorkoutPlan(draftPlan) ? draftPlan : null;
  const nutritionActivePlan = isNutritionPlan(activePlan) ? activePlan : null;
  const nutritionDraftPlan = isNutritionPlan(draftPlan) ? draftPlan : null;
  const workoutIntake = isWorkoutIntake(intake) ? intake : defaultIntake;
  const nutritionIntake = useMemo(() => {
    const base = isNutritionIntake(intake) ? intake : defaultNutritionIntake;
    return {
      ...base,
      goal: base.goal ?? defaultNutritionGoal,
    };
  }, [defaultNutritionGoal, intake]);

  const scrollToBottom = useCallback((animated = true) => {
    chatScrollRef.current?.scrollToEnd({ animated });
  }, []);

  const workspaceBusy =
    (Boolean(coach) && (!hydrated || !historyChecked)) || isAsyncWorkflowBusy(asyncState.workspace);
  const loadingState = deriveSurfaceLoadState({
    blockingLoad: workspaceBusy && !workspaceSeeded,
    hydrated,
    refreshing: workspaceBusy && workspaceSeeded,
    hasUsableSnapshot: workspaceSeeded,
    mutating: isAsyncWorkflowBusy(asyncState.send) || planStage !== "idle" || feedbackLogging,
  });
  const workspaceLoading = loadingState.blockingLoad || loadingState.refreshing;
  const workspaceSkeletonVisible = loadingState.blockingLoad;
  const sending = isAsyncWorkflowBusy(asyncState.send);
  const planLoadingVisible = planStage !== "idle";
  const syncError = asyncState.workspace.error;
  const sendError = asyncState.send.error;
  const planError = asyncState.plan.error;
  const setSendError = useCallback((nextError: string | null) => {
    if (nextError === null) {
      dispatchAsync({ type: "send/reset" });
      return;
    }
    dispatchAsync({ type: "send/fail", error: nextError });
  }, []);

  const { revealingMessageId, revealedChars, cursorOpacity, finishReveal, markAssistantSeen } =
    useAssistantReveal({
      messages,
      historyLoading: workspaceLoading,
      isAtBottomRef,
      scrollToBottom,
      baseCps: 45,
    });
  const assistantBusy = sending || Boolean(revealingMessageId);
  const planBusy = planLoadingVisible;
  const inlinePlanLoadingAction =
    planLoadingVisible && (planLoadingAction === "generate" || planLoadingAction === "revise_days")
      ? planLoadingAction
      : null;
  const showInlinePlanLoading = Boolean(inlinePlanLoadingAction);
  const invokeCoachChatWithRecovery = useCallback(
    async (body: Record<string, unknown>) => {
      try {
        return await invokeCoachChat(body);
      } catch (error) {
        if (!coach) throw error;
        const raw = String((error as Error)?.message ?? error);
        if (!raw.includes("No active coach selected")) throw error;

        const authResult = await fetchCurrentUserId();
        const userId = authResult.data?.userId;
        if (authResult.error || !userId) throw error;

        const repair = await setActiveCoachOnServer(userId, specialization, coach);
        if (repair.error) throw new Error(repair.error ?? "Couldn't repair active coach.");
        try {
          return await invokeCoachChat(body);
        } catch (retryError) {
          const retryRaw = String((retryError as Error)?.message ?? retryError);
          if (!retryRaw.includes("No active coach selected")) throw retryError;
          throw new Error(
            "No active coach could be resolved after re-saving your selection. This usually means Supabase migrations or the coach-chat function are out of date. Run DB migration + deploy coach-chat, then retry."
          );
        }
      }
    },
    [coach, specialization]
  );

  useEffect(() => {
    return () => {
      if (chipTimerRef.current) {
        clearTimeout(chipTimerRef.current);
      }
    };
  }, []);

  const showPlanSuccess = useCallback((message: string) => {
    if (chipTimerRef.current) clearTimeout(chipTimerRef.current);
    setPlanSuccessChip(message);
    chipTimerRef.current = setTimeout(() => {
      setPlanSuccessChip(null);
      chipTimerRef.current = null;
    }, 2000);
  }, []);

  const updateWorkoutIntake = useCallback((partial: Partial<WorkoutIntake>) => {
    setIntake((prev) => ({
      ...(isWorkoutIntake(prev) ? prev : defaultIntake),
      ...partial,
    }));
  }, []);

  const updateNutritionIntake = useCallback((partial: Partial<NutritionIntake>) => {
    setIntake((prev) => ({
      ...(isNutritionIntake(prev) ? prev : defaultNutritionIntake),
      ...partial,
    }));
  }, []);

  const openPlanIntake = useCallback(() => {
    setShowDaysRevision(false);
    dispatchAsync({ type: "plan/reset" });
    if (isWorkout) {
      setIntakeStep(1);
    }
    setShowIntake(true);
  }, [isWorkout]);

  const beginPlanLoading = useCallback(
    (action: "generate" | "revise_days" | "promote" | "discard" | null) => {
      dispatchAsync({ type: "plan/start" });
      setPlanLoadingAction(action);
      setPlanStage("sending");
    },
    []
  );

  const closePlanLoading = useCallback(async (success: boolean, doneDelayMs = 200) => {
    if (success) {
      dispatchAsync({ type: "plan/succeed" });
      setPlanStage("done");
      await sleep(doneDelayMs);
    }
    setPlanStage("idle");
    setPlanLoadingAction(null);
  }, []);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!openIntakeOnMount) return;
    if (openIntakeHandledRef.current) return;
    openIntakeHandledRef.current = true;
    if (tab !== "plan") setTab("plan");
    openPlanIntake();
  }, [openIntakeOnMount, openPlanIntake, tab]);

  useEffect(() => {
    hydrateRequestIdRef.current += 1;
    setShowIntake(false);
    setRequiresPlanFeedbackChoice(
      specialization === "nutrition" && requirePlanFeedbackChoice
    );
    setFeedbackLogging(false);
    setShowDaysRevision(false);
    setShowDraftInPlan(false);
    setActivePlan(null);
    setDraftPlan(null);
    setMessages([]);
    setHistoryChecked(false);
    setWorkspaceSeeded(false);
    setIntake(specialization === "nutrition" ? defaultNutritionIntake : defaultIntake);
    setDefaultNutritionGoal("maintain");
    openIntakeHandledRef.current = false;
    openDraftHandledRef.current = false;
    skipCachedSeedForDraftOpenRef.current = Boolean(openDraftOnMount);
    setPendingDaysPerWeek(defaultIntake.daysPerWeek);
    dispatchAsync({ type: "workspace/reset" });
    dispatchAsync({ type: "send/reset" });
    dispatchAsync({ type: "plan/reset" });
    setPlanStage("idle");
    setPlanLoadingAction(null);
  }, [openDraftOnMount, requirePlanFeedbackChoice, specialization]);

  useEffect(() => {
    if (!openDraftOnMount) return;
    if (openDraftHandledRef.current) return;
    openDraftHandledRef.current = true;
    if (tab !== "plan") setTab("plan");
    setShowIntake(false);
    setShowDraftInPlan(true);
  }, [openDraftOnMount, tab]);

  useEffect(() => {
    if (specialization !== "nutrition") {
      setRequiresPlanFeedbackChoice(false);
      return;
    }
    if (requirePlanFeedbackChoice) {
      setRequiresPlanFeedbackChoice(true);
    }
  }, [requirePlanFeedbackChoice, specialization]);

  const saveLocalState = useCallback(
    async (
      next: Pick<CoachWorkspaceState, "activePlan" | "draftPlan" | "intake" | "messages">
    ) => {
      if (!coach) return;
      await saveCoachState(
        {
          activeCoach: coach,
          activePlan: next.activePlan,
          draftPlan: next.draftPlan,
          intake: next.intake,
          messages: next.messages,
        },
        specialization
      );
    },
    [coach, specialization]
  );

  const applyWorkspaceMutation = useCallback(
    async (
      payload: CoachWorkspaceMutationPayload,
      options?: { replaceMessages?: boolean; preserveThreadIdOnNull?: boolean }
    ) => {
      if (payload.defaultNutritionGoal) {
        setDefaultNutritionGoal(payload.defaultNutritionGoal);
      }
      const nextActivePlan = payload.hasActivePlan ? payload.activePlan : activePlan;
      const nextDraftPlan = payload.hasDraftPlan ? payload.draftPlan : draftPlan;
      const nextIntake = (payload.hasIntake ? payload.intake : intake) as CoachIntake;
      const shouldPreserveThreadId = options?.preserveThreadIdOnNull ?? true;
      setThreadId(shouldPreserveThreadId ? payload.threadId ?? threadId : payload.threadId);

      setMessages((prev) => {
        const withoutOptimistic = prev.filter((message) => !message.id.startsWith("optimistic-"));
        const next = options?.replaceMessages
          ? payload.messages
          : payload.messages.length
            ? [...withoutOptimistic, ...payload.messages]
            : withoutOptimistic;
        void saveLocalState({
          activePlan: nextActivePlan,
          draftPlan: nextDraftPlan,
          intake: nextIntake,
          messages: next,
        });
        return next;
      });

      if (payload.hasActivePlan) setActivePlan(nextActivePlan);
      if (payload.hasDraftPlan) setDraftPlan(nextDraftPlan);
      if (payload.hasIntake && payload.intake) {
        setIntake(payload.intake);
        if (isWorkoutIntake(payload.intake)) {
          setPendingDaysPerWeek(clampDays(payload.intake.daysPerWeek));
        }
      }

      requestAnimationFrame(() => scrollToBottom(true));
    },
    [
      activePlan,
      clampDays,
      draftPlan,
      intake,
      saveLocalState,
      scrollToBottom,
      threadId,
    ]
  );

  const hydrateWorkspace = useCallback(async () => {
    if (!coach || !hydrated) return;
    if (workspaceRequestInFlightRef.current) return;
    const requestId = hydrateRequestIdRef.current + 1;
    hydrateRequestIdRef.current = requestId;
    workspaceRequestInFlightRef.current = true;
    logCoachRequestDiagnostics({
      scope: "useCoachWorkspace/hydrate",
      requestId,
      phase: "start",
      details: {
        specialization,
        coach: `${coach.gender}:${coach.personality}`,
      },
    });
    dispatchAsync({ type: "workspace/start" });

    const baseIntake =
      specialization === "nutrition" ? defaultNutritionIntake : defaultIntake;
    let didSucceed = false;
    try {
      const workflowResult = await hydrateCoachWorkspaceWorkflow({
        coach,
        specialization,
        hydrated,
        defaultIntake: baseIntake,
        coachIdentityPayload,
        invokeCoachChat: invokeCoachChatWithRecovery,
        skipCachedState: skipCachedSeedForDraftOpenRef.current,
        onCachedState: (state) => {
          if (requestId !== hydrateRequestIdRef.current) return;
          setWorkspaceSeeded(true);
          setActivePlan(state.activePlan);
          setDraftPlan(state.draftPlan);
          setShowDraftInPlan((current) => {
            if (!state.draftPlan) return current;
            if (!state.activePlan) return true;
            return current;
          });
          setIntake(state.intake);
          if (specialization === "workout") {
            setPendingDaysPerWeek(
              clampDays(
                (isWorkoutIntake(state.intake) ? state.intake.daysPerWeek : null) ??
                  (isWorkoutPlan(state.activePlan) ? state.activePlan.daysPerWeek : null) ??
                  (isWorkoutPlan(state.draftPlan) ? state.draftPlan.daysPerWeek : null) ??
                  defaultIntake.daysPerWeek,
              ),
            );
          }
          if (state.messages.length) {
            setMessages(state.messages);
            for (const message of state.messages) {
              if (message.role === "assistant") markAssistantSeen(message.id);
            }
          }
        },
      });

      if (requestId !== hydrateRequestIdRef.current) {
        logCoachRequestDiagnostics({
          scope: "useCoachWorkspace/hydrate",
          requestId,
          phase: "stale",
        });
        return;
      }
      skipCachedSeedForDraftOpenRef.current = false;

      if (workflowResult.status === "skipped") {
        logCoachRequestDiagnostics({
          scope: "useCoachWorkspace/hydrate",
          requestId,
          phase: "skip",
        });
        return;
      }

      if (workflowResult.status === "tier_required") {
        onTierRequired?.();
        dispatchAsync({ type: "workspace/succeed" });
        setHistoryChecked(true);
        setWorkspaceSeeded(true);
        logCoachRequestDiagnostics({
          scope: "useCoachWorkspace/hydrate",
          requestId,
          phase: "error",
          details: {
            message: "tier_required",
          },
        });
        return;
      }

      if (workflowResult.status === "error") {
        dispatchAsync({ type: "workspace/fail", error: workflowResult.error.message });
        setHistoryChecked(true);
        setWorkspaceSeeded(true);
        logCoachRequestDiagnostics({
          scope: "useCoachWorkspace/hydrate",
          requestId,
          phase: "error",
          details: {
            message: workflowResult.error.message,
          },
        });
        return;
      }

      await applyWorkspaceMutation(workflowResult.payload.remote, {
        replaceMessages: true,
        preserveThreadIdOnNull: false,
      });
      dispatchAsync({ type: "workspace/succeed" });
      didSucceed = true;

      if (
        openDraftHandledRef.current &&
        workflowResult.payload.remote.hasDraftPlan &&
        workflowResult.payload.remote.draftPlan
      ) {
        setShowDraftInPlan(true);
      }
    } finally {
      if (requestId === hydrateRequestIdRef.current) {
        if (didSucceed) {
          setHistoryChecked(true);
          setWorkspaceSeeded(true);
          logCoachRequestDiagnostics({
            scope: "useCoachWorkspace/hydrate",
            requestId,
            phase: "success",
          });
        }
        workspaceRequestInFlightRef.current = false;
      }
    }
  }, [
    applyWorkspaceMutation,
    clampDays,
    coach,
    coachIdentityPayload,
    hydrated,
    invokeCoachChatWithRecovery,
    markAssistantSeen,
    onTierRequired,
    specialization,
    workspaceRequestInFlightRef,
  ]);

  useEffect(() => {
    hydrateWorkspaceRef.current = hydrateWorkspace;
  });

  useEffect(() => {
    hasHandledInitialFocusRef.current = false;
  }, [coach?.gender, coach?.personality, hydrated, specialization]);

  useEffect(() => {
    if (!coach || !hydrated) return;
    void hydrateWorkspace();
  }, [coach?.gender, coach?.personality, hydrated, specialization]);

  useFocusEffect(
    useCallback(() => {
      if (!coach || !hydrated) return;
      if (!hasHandledInitialFocusRef.current) {
        hasHandledInitialFocusRef.current = true;
        return;
      }
      void hydrateWorkspaceRef.current();
    }, [coach?.gender, coach?.personality, hydrated, specialization])
  );

  useEffect(() => {
    if (!coach || !hydrated) return;
    if (!historyChecked) return;
    if (messages.length) return;
    if (syncError) return;

    const greeting: ChatMessage = {
      id: "coach-greeting",
      role: "assistant",
      content:
        specialization === "nutrition"
          ? `I'm ${coach.displayName}. Tell me your nutrition goal, and we'll build your meal plan.`
          : `I'm ${coach.displayName}. Tell me your goal and schedule, and we'll build your workout plan. I can also revise it in chat (for example: make this 5 days/week).`,
    };
    markAssistantSeen(greeting.id);
    setMessages([greeting]);
  }, [
    coach,
    historyChecked,
    hydrated,
    markAssistantSeen,
    messages.length,
    specialization,
    syncError,
  ]);

  const generatePlan = useCallback(async () => {
    if (!coach) return;
    const nutritionPayload = isWorkout
      ? null
      : isNutritionIntake(intake)
        ? normalizeNutritionIntake({
            ...intake,
            goal: intake.goal ?? defaultNutritionGoal,
          })
        : normalizeNutritionIntake({
            ...defaultNutritionIntake,
            goal: defaultNutritionGoal,
          });

    if (!isWorkout && !nutritionPayload?.goal) {
      dispatchAsync({ type: "plan/fail", error: "Choose Lose, Maintain, or Gain." });
      return;
    }

    beginPlanLoading("generate");
    const intakePayload = isWorkout
      ? isWorkoutIntake(intake)
        ? intake
        : defaultIntake
      : nutritionPayload!;

    await sleep(180);
    setPlanStage("modeling");
    const modelingStartedAt = Date.now();
    const workflowResult = await generatePlanWorkflow({
      invokeCoachChat: invokeCoachChatWithRecovery,
      specialization,
      planType,
      intake: intakePayload as Record<string, unknown>,
      coachIdentityPayload,
      currentActivePlan: activePlan,
      currentDraftPlan: draftPlan,
      currentIntake: intake,
      currentThreadId: threadId,
      defaultIntake,
    });

    if (workflowResult.status === "tier_required") {
      onTierRequired?.();
      dispatchAsync({ type: "plan/reset" });
      await closePlanLoading(false);
      return;
    }

    if (workflowResult.status === "error") {
      dispatchAsync({ type: "plan/fail", error: workflowResult.error.message });
      if (
        workflowResult.error.status === 501 ||
        workflowResult.error.code === "OPENAI_NOT_CONFIGURED"
      ) {
        setPlanApiUnavailable(true);
      }
      await closePlanLoading(false);
      return;
    }

    const modelingElapsed = Date.now() - modelingStartedAt;
    if (modelingElapsed < 1000) {
      await sleep(1000 - modelingElapsed);
    }
    setPlanStage("persisting");
    await sleep(700);
    setPlanApiUnavailable(false);
    await applyWorkspaceMutation(workflowResult.payload);
    showPlanSuccess(`Draft generated by ${coach.displayName}`);
    setTab("plan");
    await closePlanLoading(true, 700);
    setShowIntake(false);
    if (isWorkout) setShowDaysRevision(false);
    setShowDraftInPlan(true);
  }, [
    activePlan,
    applyWorkspaceMutation,
    beginPlanLoading,
    closePlanLoading,
    coach,
    coachIdentityPayload,
    defaultNutritionGoal,
    draftPlan,
    intake,
    invokeCoachChatWithRecovery,
    isWorkout,
    onTierRequired,
    planType,
    showPlanSuccess,
    specialization,
    threadId,
  ]);

  const revisePlanDays = useCallback(async () => {
    if (!coach || !hasAnyPlan || !isWorkout) return;
    beginPlanLoading("revise_days");
    await sleep(180);
    setPlanStage("modeling");
    const modelingStartedAt = Date.now();
    const workflowResult = await revisePlanWorkflow({
      invokeCoachChat: invokeCoachChatWithRecovery,
      specialization,
      planType,
      daysPerWeek: clampDays(pendingDaysPerWeek),
      coachIdentityPayload,
      currentActivePlan: activePlan,
      currentDraftPlan: draftPlan,
      currentIntake: intake,
      currentThreadId: threadId,
      defaultIntake,
    });

    if (workflowResult.status === "tier_required") {
      onTierRequired?.();
      dispatchAsync({ type: "plan/reset" });
      await closePlanLoading(false);
      return;
    }

    if (workflowResult.status === "error") {
      dispatchAsync({ type: "plan/fail", error: workflowResult.error.message });
      if (
        workflowResult.error.status === 501 ||
        workflowResult.error.code === "OPENAI_NOT_CONFIGURED"
      ) {
        setPlanApiUnavailable(true);
      }
      await closePlanLoading(false);
      return;
    }

    const modelingElapsed = Date.now() - modelingStartedAt;
    if (modelingElapsed < 1000) {
      await sleep(1000 - modelingElapsed);
    }
    setPlanStage("persisting");
    await sleep(700);
    setPlanApiUnavailable(false);
    await applyWorkspaceMutation(workflowResult.payload);
    showPlanSuccess(`Draft generated by ${coach.displayName}`);
    setTab("plan");
    await closePlanLoading(true, 700);
    setShowDaysRevision(false);
    setShowDraftInPlan(true);
  }, [
    activePlan,
    applyWorkspaceMutation,
    beginPlanLoading,
    clampDays,
    closePlanLoading,
    coach,
    coachIdentityPayload,
    draftPlan,
    hasAnyPlan,
    intake,
    invokeCoachChatWithRecovery,
    isWorkout,
    onTierRequired,
    pendingDaysPerWeek,
    planType,
    showPlanSuccess,
    specialization,
    threadId,
  ]);

  const promoteDraftPlan = useCallback(async () => {
    if (!draftPlan) return;
    beginPlanLoading("promote");
    await sleep(60);
    setPlanStage("persisting");
    const workflowResult = await promoteDraftWorkflow({
      invokeCoachChat: invokeCoachChatWithRecovery,
      specialization,
      planType,
      coachIdentityPayload,
      currentActivePlan: activePlan,
      currentDraftPlan: draftPlan,
      currentIntake: intake,
      currentThreadId: threadId,
      defaultIntake: specialization === "nutrition" ? defaultNutritionIntake : defaultIntake,
    });

    if (workflowResult.status === "tier_required") {
      onTierRequired?.();
      dispatchAsync({ type: "plan/reset" });
      await closePlanLoading(false);
      return;
    }

    if (workflowResult.status === "error") {
      dispatchAsync({ type: "plan/fail", error: workflowResult.error.message });
      await closePlanLoading(false);
      return;
    }

    await applyWorkspaceMutation(workflowResult.payload);
    if (specialization === "nutrition") {
      publishCoachSyncEvent({
        type: "nutrition_draft_resolved",
        resolution: "promoted",
        resolvedAt: Date.now(),
      });
    }
    publishCoachSyncEvent({
      type: "workspace_plan_changed",
      specialization,
      changedAt: Date.now(),
    });
    setShowDraftInPlan(false);
    await closePlanLoading(true);
  }, [
    activePlan,
    applyWorkspaceMutation,
    beginPlanLoading,
    closePlanLoading,
    coachIdentityPayload,
    draftPlan,
    intake,
    invokeCoachChatWithRecovery,
    onTierRequired,
    planType,
    specialization,
    threadId,
  ]);

  const discardDraftPlan = useCallback(async () => {
    if (!draftPlan) return;
    beginPlanLoading("discard");
    await sleep(90);
    setPlanStage("modeling");
    const workflowResult = await discardDraftWorkflow({
      invokeCoachChat: invokeCoachChatWithRecovery,
      specialization,
      planType,
      coachIdentityPayload,
      currentActivePlan: activePlan,
      currentDraftPlan: draftPlan,
      currentIntake: intake,
      currentThreadId: threadId,
      defaultIntake: specialization === "nutrition" ? defaultNutritionIntake : defaultIntake,
    });

    if (workflowResult.status === "tier_required") {
      onTierRequired?.();
      dispatchAsync({ type: "plan/reset" });
      await closePlanLoading(false);
      return;
    }

    if (workflowResult.status === "error") {
      dispatchAsync({ type: "plan/fail", error: workflowResult.error.message });
      await closePlanLoading(false);
      return;
    }

    setPlanStage("persisting");
    await applyWorkspaceMutation(workflowResult.payload);
    if (specialization === "nutrition") {
      publishCoachSyncEvent({
        type: "nutrition_draft_resolved",
        resolution: "discarded",
        resolvedAt: Date.now(),
      });
    }
    publishCoachSyncEvent({
      type: "workspace_plan_changed",
      specialization,
      changedAt: Date.now(),
    });
    setShowDraftInPlan(false);
    await closePlanLoading(true);
  }, [
    activePlan,
    applyWorkspaceMutation,
    beginPlanLoading,
    closePlanLoading,
    coachIdentityPayload,
    draftPlan,
    intake,
    invokeCoachChatWithRecovery,
    onTierRequired,
    planType,
    specialization,
    threadId,
  ]);

  const sendMessage = useCallback(
    async (content: string, clearDraft: boolean) => {
      if (assistantBusy) return;
      if (!coach || !content) return;
      dispatchAsync({ type: "send/start" });
      if (clearDraft) setDraft("");
      lastSendRef.current = content;

      const workflowResult = await sendCoachMessageWorkflow({
        content,
        specialization,
        planType,
        coachIdentityPayload,
        invokeCoachChat: invokeCoachChatWithRecovery,
        currentActivePlan: activePlan,
        currentDraftPlan: draftPlan,
        currentIntake: intake,
        currentThreadId: threadId,
        applyOptimisticMessage: (message) => {
          setMessages((prev) => [...prev, message]);
          isAtBottomRef.current = true;
          setShowScrollToBottom(false);
          requestAnimationFrame(() => scrollToBottom(true));
        },
        rollbackOptimisticMessage: (messageId) => {
          setMessages((prev) => prev.filter((message) => message.id !== messageId));
        },
      });

      if (workflowResult.status === "tier_required") {
        onTierRequired?.();
        dispatchAsync({ type: "send/reset" });
        return;
      }

      if (workflowResult.status === "error") {
        dispatchAsync({ type: "send/fail", error: workflowResult.error.message });
        return;
      }

      await applyWorkspaceMutation(workflowResult.payload);
      dispatchAsync({ type: "send/succeed" });
    },
    [
      activePlan,
      applyWorkspaceMutation,
      assistantBusy,
      coach,
      coachIdentityPayload,
      draftPlan,
      intake,
      invokeCoachChatWithRecovery,
      onTierRequired,
      planType,
      scrollToBottom,
      specialization,
      threadId,
    ]
  );

  const handleSend = useCallback(async () => {
    const content = draft.trim();
    await sendMessage(content, true);
  }, [draft, sendMessage]);

  const handleScrollDistanceFromBottomChange = useCallback((distanceFromBottom: number) => {
    const atBottom = distanceFromBottom < 80;
    isAtBottomRef.current = atBottom;
    setShowScrollToBottom((prev) => (prev === !atBottom ? prev : !atBottom));
  }, []);

  const handleChatContentSizeChange = useCallback(() => {
    if (!isAtBottomRef.current) return;
    scrollToBottom(true);
  }, [scrollToBottom]);

  const retryLastSend = useCallback(() => {
    const last = lastSendRef.current;
    if (!last) return;
    setDraft(last);
    setSendError(null);
    requestAnimationFrame(() => composerRef.current?.focus());
  }, []);

  const logNutritionPlanFeedbackDecision = useCallback(
    async (decision: "accept" | "not_now" | "ask_coach") => {
      if (!coach || specialization !== "nutrition") return false;
      setFeedbackLogging(true);
      try {
        await invokeCoachChatWithRecovery({
          action: "plan_feedback_log",
          specialization,
          plan_type: specialization,
          decision,
          context: feedbackContext,
          ...coachIdentityPayload,
        });
        void trackPlanDecisionMadeEvent({
          coach,
          decision,
          userTier,
          context: feedbackContext,
        });
        return true;
      } catch {
        return false;
      } finally {
        setFeedbackLogging(false);
      }
    },
    [
      coach,
      coachIdentityPayload,
      feedbackContext,
      invokeCoachChatWithRecovery,
      specialization,
      userTier,
    ]
  );

  const handleAcceptUpdatedNutritionPlan = useCallback(async () => {
    if (requiresPlanFeedbackChoice) {
      await logNutritionPlanFeedbackDecision("accept");
      setRequiresPlanFeedbackChoice(false);
    }
    await promoteDraftPlan();
  }, [
    logNutritionPlanFeedbackDecision,
    promoteDraftPlan,
    requiresPlanFeedbackChoice,
  ]);

  const handleNotNowUpdatedNutritionPlan = useCallback(async () => {
    await logNutritionPlanFeedbackDecision("not_now");
    setRequiresPlanFeedbackChoice(false);
    setShowDraftInPlan(true);
  }, [logNutritionPlanFeedbackDecision]);

  const handleAskCoachAboutUpdatedNutritionPlan = useCallback(async () => {
    await logNutritionPlanFeedbackDecision("ask_coach");
    setRequiresPlanFeedbackChoice(false);
    setTab("chat");
    if (!draft.trim().length) {
      setDraft("Can you explain what changed in this updated nutrition plan and why?");
    }
  }, [draft, logNutritionPlanFeedbackDecision]);

  const openDaysRevision = useCallback(() => {
    setPendingDaysPerWeek(
      clampDays(
        workoutIntake.daysPerWeek ||
          displayedWorkoutPlan?.daysPerWeek ||
          defaultIntake.daysPerWeek
      )
    );
    setShowDaysRevision(true);
  }, [clampDays, displayedWorkoutPlan?.daysPerWeek, workoutIntake.daysPerWeek]);

  useEffect(() => {
    if (!prefill?.trim().length) return;
    if (prefillHandledRef.current) return;
    prefillHandledRef.current = true;
    setDraft((current) => (current.trim().length ? current : prefill));
  }, [prefill]);

  // Backward-compatible aliases while callers migrate to explicit action names.
  const handleGeneratePlanFromIntake = generatePlan;
  const handleReviseDaysPerWeek = revisePlanDays;
  const handleKeepNewPlan = handleAcceptUpdatedNutritionPlan;
  const handleDiscardNewPlan = discardDraftPlan;

  return {
    tab,
    setTab,
    activePlan,
    draftPlan,
    showDraftInPlan,
    setShowDraftInPlan,
    showIntake,
    setShowIntake,
    requiresPlanFeedbackChoice,
    feedbackLogging,
    showDaysRevision,
    setShowDaysRevision,
    pendingDaysPerWeek,
    setPendingDaysPerWeek,
    intakeStep,
    setIntakeStep,
    messages,
    workspaceLoading,
    workspaceSkeletonVisible,
    blockingLoad: loadingState.blockingLoad,
    refreshingWorkspace: loadingState.refreshing,
    hasUsableSnapshot: loadingState.hasUsableSnapshot,
    mutating: loadingState.mutating,
    hydrated: loadingState.hydrated,
    workspaceStatus: asyncState.workspace.status,
    syncError,
    sendError,
    setSendError,
    sendStatus: asyncState.send.status,
    planError,
    planStatus: asyncState.plan.status,
    planApiUnavailable,
    sending,
    planLoadingVisible,
    planStage,
    planLoadingAction,
    planSuccessChip,
    composerHeight,
    setComposerHeight,
    showScrollToBottom,
    setShowScrollToBottom,
    draft,
    setDraft,
    chatScrollRef,
    composerRef,
    isAtBottomRef,
    headerTitle,
    isWorkout,
    displayedPlanKind,
    planBadge,
    hasAnyPlan,
    hasToggle,
    displayedWorkoutPlan,
    displayedNutritionPlan,
    workoutActivePlan,
    workoutDraftPlan,
    nutritionActivePlan,
    nutritionDraftPlan,
    workoutIntake,
    nutritionIntake,
    revealingMessageId,
    revealedChars,
    cursorOpacity,
    finishReveal,
    assistantBusy,
    planBusy,
    inlinePlanLoadingAction,
    showInlinePlanLoading,
    clampDays,
    openPlanIntake,
    hydrateWorkspace,
    updateWorkoutIntake,
    updateNutritionIntake,
    generatePlan,
    revisePlanDays,
    promoteDraftPlan,
    discardDraftPlan,
    handleAcceptUpdatedNutritionPlan,
    handleNotNowUpdatedNutritionPlan,
    handleAskCoachAboutUpdatedNutritionPlan,
    handleGeneratePlanFromIntake,
    handleReviseDaysPerWeek,
    handleKeepNewPlan,
    handleDiscardNewPlan,
    sendMessage,
    handleSend,
    scrollToBottom,
    handleScrollDistanceFromBottomChange,
    handleChatContentSizeChange,
    retryLastSend,
    openDaysRevision,
  };
}
