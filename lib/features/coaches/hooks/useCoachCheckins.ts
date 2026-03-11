import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MembershipTier } from "../../../data/types";
import type { ActiveCoach } from "../types";
import { useCoach } from "./CoachContext";
import type {
  CoachCheckinsPayload,
  WeeklyCheckin,
  WeeklyWeightSnapshot,
} from "../types/checkinsTypes";
import {
  hydrateCoachCheckinsWorkflow,
  submitCoachCheckinWorkflow,
} from "../workflows";
import {
  coachSyncIdentityKey,
  publishCoachSyncEvent,
  subscribeCoachSyncEvents,
} from "../services/syncEvents";
import { trackCheckinSubmissionEvents } from "../services/funnelTracking";
import {
  buildWeeklyCheckinSubmitInput,
  CURRENT_WEIGHT_INPUT_UNIT,
  deriveLegacyCheckinFormValues,
  deriveV2CheckinFormValues,
  type WeeklyCheckinV2Form,
} from "../models/checkinForm";
import { deriveSurfaceLoadState } from "../../shared";

type UseCoachCheckinsOptions = {
  coach: ActiveCoach | null;
  hydrated: boolean;
  userTier?: MembershipTier | null;
  onTierRequired?: () => void;
};

const DEFAULT_WEIGHT_SNAPSHOT: WeeklyWeightSnapshot = {
  unit: "lb",
  entries: 0,
  startWeight: null,
  endWeight: null,
  delta: null,
  trend: "no_data",
};

const checkinsPayloadCache = new Map<string, CoachCheckinsPayload>();

function coachCheckinsCacheKey(
  authUserId: string | null | undefined,
  coach: ActiveCoach | null | undefined
): string | null {
  if (!authUserId || !coach) return null;
  return `${authUserId}:${coach.specialization}:${coach.gender}:${coach.personality}`;
}

function hasCheckinsSnapshot(payload: CoachCheckinsPayload | null | undefined) {
  if (!payload) return false;
  return Boolean(
    payload.weekStart.length
      || payload.weekEnd.length
      || payload.currentCheckin
      || payload.history.length
  );
}

function applyCurrentCheckinForm(
  checkin: WeeklyCheckin | null,
  setEnergy: (energy: number) => void,
  setAdherence: (adherence: string) => void,
  setBlockers: (blockers: string) => void,
  setV2Form: (form: WeeklyCheckinV2Form) => void
) {
  const legacy = deriveLegacyCheckinFormValues(checkin);
  setEnergy(legacy.energy);
  setAdherence(legacy.adherencePercent);
  setBlockers(legacy.blockers);
  setV2Form(deriveV2CheckinFormValues(checkin));
}

export function useCoachCheckins({
  coach,
  hydrated,
  userTier,
  onTierRequired,
}: UseCoachCheckinsOptions) {
  const { authUserId } = useCoach();
  const syncEventCoachKey = useMemo(
    () => coachSyncIdentityKey(coach),
    [coach?.gender, coach?.personality, coach?.specialization]
  );
  const cacheKey = useMemo(
    () => coachCheckinsCacheKey(authUserId, coach),
    [authUserId, coach?.gender, coach?.personality, coach?.specialization]
  );
  const requestIdentityKey = cacheKey ?? `${authUserId ?? "guest"}:no-coach`;
  const cachedPayload = cacheKey ? (checkinsPayloadCache.get(cacheKey) ?? null) : null;
  const hasCachedSnapshot = hasCheckinsSnapshot(cachedPayload);
  const initialLegacyForm = deriveLegacyCheckinFormValues(
    cachedPayload?.currentCheckin ?? null
  );
  const initialV2Form = deriveV2CheckinFormValues(
    cachedPayload?.currentCheckin ?? null
  );

  const [historyLoading, setHistoryLoading] = useState(
    () => Boolean(cacheKey && hydrated && !hasCachedSnapshot)
  );
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const [threadId, setThreadId] = useState<string | null>(() => cachedPayload?.threadId ?? null);
  const [weekStart, setWeekStart] = useState(() => cachedPayload?.weekStart ?? "");
  const [weekEnd, setWeekEnd] = useState(() => cachedPayload?.weekEnd ?? "");
  const [weightSnapshot, setWeightSnapshot] = useState<WeeklyWeightSnapshot>(
    () => cachedPayload?.weightSnapshot ?? DEFAULT_WEIGHT_SNAPSHOT
  );
  const [currentCheckin, setCurrentCheckin] = useState<WeeklyCheckin | null>(
    () => cachedPayload?.currentCheckin ?? null
  );
  const [history, setHistory] = useState<WeeklyCheckin[]>(() => cachedPayload?.history ?? []);
  const [planUpdatedForReview, setPlanUpdatedForReview] = useState(
    () => cachedPayload?.planUpdatedForReview ?? false
  );
  const [planUpdateError, setPlanUpdateError] = useState<string | null>(
    () => cachedPayload?.planUpdateError ?? null
  );
  const [checkinArtifact, setCheckinArtifact] = useState(() => cachedPayload?.checkinArtifact ?? null);
  const [adjustmentRecommendations, setAdjustmentRecommendations] = useState(
    () => cachedPayload?.adjustmentRecommendations ?? null
  );
  const [coachMessage, setCoachMessage] = useState(
    () => cachedPayload?.coachMessage ?? null
  );
  const [guardrailNotes, setGuardrailNotes] = useState<string[]>(
    () => cachedPayload?.guardrailNotes ?? []
  );

  const [energy, setEnergy] = useState(() => initialLegacyForm.energy);
  const [adherencePercent, setAdherencePercent] = useState(() => initialLegacyForm.adherencePercent);
  const [blockers, setBlockers] = useState(() => initialLegacyForm.blockers);
  const [v2Form, setV2Form] = useState<WeeklyCheckinV2Form>(() => initialV2Form);

  const hasSeedDataRef = useRef(hasCheckinsSnapshot(cachedPayload));
  const hydrateRequestIdRef = useRef(0);
  const submitRequestIdRef = useRef(0);
  const submitInFlightRef = useRef(false);
  const mutationTokenRef = useRef(0);
  const requestIdentityRef = useRef(requestIdentityKey);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSaveSuccessMessage = useCallback(() => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setSaveSuccessMessage(null);
  }, []);

  const showSaveSuccessMessage = useCallback((message: string) => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    setSaveSuccessMessage(message);
    successTimerRef.current = setTimeout(() => {
      setSaveSuccessMessage(null);
      successTimerRef.current = null;
    }, 2200);
  }, []);

  const updateV2Field = useCallback(
    <K extends keyof WeeklyCheckinV2Form>(key: K, value: WeeklyCheckinV2Form[K]) => {
      setV2Form((current) => ({
        ...current,
        [key]: value,
      }));
    },
    []
  );

  const resetToDefaults = useCallback(() => {
    setThreadId(null);
    setWeekStart("");
    setWeekEnd("");
    setWeightSnapshot(DEFAULT_WEIGHT_SNAPSHOT);
    setCurrentCheckin(null);
    setHistory([]);
    setPlanUpdatedForReview(false);
    setPlanUpdateError(null);
    setCheckinArtifact(null);
    setAdjustmentRecommendations(null);
    setCoachMessage(null);
    setGuardrailNotes([]);
    applyCurrentCheckinForm(
      null,
      setEnergy,
      setAdherencePercent,
      setBlockers,
      setV2Form
    );
    hasSeedDataRef.current = false;
  }, []);

  const clearResolvedPlanReviewState = useCallback(() => {
    setPlanUpdatedForReview(false);
    setPlanUpdateError(null);
    if (!cacheKey) {
      return;
    }

    const cached = checkinsPayloadCache.get(cacheKey);
    if (!cached) {
      return;
    }

    const {
      planUpdatedForReview: _planUpdatedForReview,
      planUpdateError: _planUpdateError,
      ...rest
    } = cached;
    checkinsPayloadCache.set(cacheKey, rest);
  }, [cacheKey]);

  const applyPayload = useCallback((payload: CoachCheckinsPayload, syncForm: boolean) => {
    setThreadId(payload.threadId);
    setWeekStart(payload.weekStart);
    setWeekEnd(payload.weekEnd);
    setWeightSnapshot(payload.weightSnapshot);
    setCurrentCheckin(payload.currentCheckin);
    setHistory(payload.history);
    setPlanUpdatedForReview(payload.planUpdatedForReview ?? false);
    setPlanUpdateError(payload.planUpdateError ?? null);
    setCheckinArtifact(payload.checkinArtifact ?? null);
    setAdjustmentRecommendations(payload.adjustmentRecommendations ?? null);
    setCoachMessage(payload.coachMessage ?? null);
    setGuardrailNotes(payload.guardrailNotes ?? []);
    hasSeedDataRef.current = hasCheckinsSnapshot(payload);

    if (cacheKey) {
      checkinsPayloadCache.set(cacheKey, payload);
    }

    if (syncForm) {
      applyCurrentCheckinForm(
        payload.currentCheckin,
        setEnergy,
        setAdherencePercent,
        setBlockers,
        setV2Form
      );
    }
  }, [cacheKey]);

  useEffect(() => {
    setRefreshing(false);
    setSaving(false);
    setSyncError(null);
    setSaveError(null);
    setValidationMessage(null);
    clearSaveSuccessMessage();
    submitInFlightRef.current = false;
    mutationTokenRef.current += 1;
    hydrateRequestIdRef.current += 1;
    submitRequestIdRef.current += 1;
    requestIdentityRef.current = requestIdentityKey;

    if (!cacheKey) {
      setHistoryLoading(false);
      resetToDefaults();
      return;
    }

    const cached = checkinsPayloadCache.get(cacheKey) ?? null;
    if (cached) {
      setHistoryLoading(false);
      applyPayload(cached, true);
      return;
    }

    setHistoryLoading(hydrated);
    resetToDefaults();
  }, [applyPayload, cacheKey, clearSaveSuccessMessage, hydrated, requestIdentityKey, resetToDefaults]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeCoachSyncEvents((event) => {
      if (event.type !== "nutrition_draft_resolved") {
        return;
      }
      if (event.authUserId !== authUserId) {
        return;
      }
      if (!syncEventCoachKey || event.coachIdentityKey !== syncEventCoachKey) {
        return;
      }
      clearResolvedPlanReviewState();
    });
    return unsubscribe;
  }, [authUserId, clearResolvedPlanReviewState, syncEventCoachKey]);

  const hydrateCheckins = useCallback(async () => {
    if (!hydrated || !coach) return;

    const requestIdentity = requestIdentityKey;
    const requestId = hydrateRequestIdRef.current + 1;
    hydrateRequestIdRef.current = requestId;
    const mutationTokenAtStart = mutationTokenRef.current;
    const shouldBlock = !hasSeedDataRef.current;

    if (shouldBlock) {
      setHistoryLoading(true);
      setRefreshing(false);
    } else {
      setHistoryLoading(false);
      setRefreshing(true);
    }
    setSyncError(null);

    try {
      const result = await hydrateCoachCheckinsWorkflow({
        authUserId,
        coach,
        limit: 26,
      });

      if (
        requestId !== hydrateRequestIdRef.current
        || mutationTokenAtStart !== mutationTokenRef.current
        || requestIdentityRef.current !== requestIdentity
      ) return;

      if (result.status === "tier_required") {
        onTierRequired?.();
        return;
      }

      if (result.status === "error") {
        setSyncError(result.error.message);
        return;
      }

      applyPayload(result.payload, true);
    } finally {
      if (
        requestId === hydrateRequestIdRef.current
        && requestIdentityRef.current === requestIdentity
      ) {
        setHistoryLoading(false);
        setRefreshing(false);
      }
    }
  }, [applyPayload, authUserId, coach, hydrated, onTierRequired, requestIdentityKey]);

  const submitCheckin = useCallback(async () => {
    if (!hydrated || !coach) return { saved: false } as const;
    if (submitInFlightRef.current) return { saved: false } as const;

    clearSaveSuccessMessage();
    setSaveError(null);
    setValidationMessage(null);
    setSyncError(null);

    const normalized = buildWeeklyCheckinSubmitInput({
      energy,
      adherencePercent,
      blockers,
      v2Form,
    });

    if (!normalized.input) {
      setValidationMessage(normalized.validationMessage);
      return { saved: false } as const;
    }

    const wasEditingCurrentWeek = Boolean(currentCheckin && currentCheckin.weekStart === weekStart);
    const requestIdentity = requestIdentityKey;
    const requestId = submitRequestIdRef.current + 1;
    submitRequestIdRef.current = requestId;
    submitInFlightRef.current = true;
    setSaving(true);

    try {
      const result = await submitCoachCheckinWorkflow({
        authUserId,
        coach,
        limit: 26,
        input: normalized.input,
      });

      if (
        requestId !== submitRequestIdRef.current
        || requestIdentityRef.current !== requestIdentity
      ) {
        return { saved: false } as const;
      }

      if (result.status === "tier_required") {
        onTierRequired?.();
        return { saved: false } as const;
      }

      if (result.status === "error") {
        setSaveError(result.error.message);
        return { saved: false, error: result.error.message } as const;
      }

      mutationTokenRef.current += 1;
      applyPayload(result.payload, true);
      if (authUserId && syncEventCoachKey) {
        publishCoachSyncEvent({
          type: "checkin_submitted",
          authUserId,
          specialization: "nutrition",
          coachIdentityKey: syncEventCoachKey,
          planUpdatedForReview: Boolean(result.payload.planUpdatedForReview),
          submittedAt: Date.now(),
        });
      }
      void trackCheckinSubmissionEvents({
        coach,
        userTier,
        weekStart: result.payload.weekStart || weekStart || null,
        checkinId: result.payload.currentCheckin?.id ?? null,
        saveMode: wasEditingCurrentWeek ? "update" : "create",
        planUpdatedForReview: Boolean(result.payload.planUpdatedForReview),
      });
      showSaveSuccessMessage(
        wasEditingCurrentWeek ? "Weekly check-in updated." : "Weekly check-in saved."
      );
      return { saved: true } as const;
    } finally {
      if (
        requestId === submitRequestIdRef.current
        && requestIdentityRef.current === requestIdentity
      ) {
        setSaving(false);
        submitInFlightRef.current = false;
      }
    }
  }, [
    adherencePercent,
    applyPayload,
    authUserId,
    blockers,
    clearSaveSuccessMessage,
    coach,
    currentCheckin,
    energy,
    hydrated,
    onTierRequired,
    showSaveSuccessMessage,
    syncEventCoachKey,
    requestIdentityKey,
    userTier,
    v2Form,
    weekStart,
  ]);

  const isEditingCurrentWeek = useMemo(() => {
    return Boolean(currentCheckin && currentCheckin.weekStart === weekStart);
  }, [currentCheckin, weekStart]);

  const loadingState = deriveSurfaceLoadState({
    blockingLoad: historyLoading && !hasSeedDataRef.current,
    hydrated,
    refreshing,
    hasUsableSnapshot: hasSeedDataRef.current,
    mutating: saving,
  });

  return {
    threadId,
    historyLoading,
    refreshing,
    blockingLoad: loadingState.blockingLoad,
    hydrated: loadingState.hydrated,
    hasUsableSnapshot: loadingState.hasUsableSnapshot,
    mutating: loadingState.mutating,
    saving,
    syncError,
    saveError,
    validationMessage,
    saveSuccessMessage,
    weekStart,
    weekEnd,
    weightSnapshot,
    currentCheckin,
    history,
    planUpdatedForReview,
    planUpdateError,
    checkinArtifact,
    adjustmentRecommendations,
    coachMessage,
    guardrailNotes,
    energy,
    setEnergy,
    adherencePercent,
    setAdherencePercent,
    blockers,
    setBlockers,
    currentWeightInputUnit: CURRENT_WEIGHT_INPUT_UNIT,
    v2Form,
    setV2Form,
    updateV2Field,
    isEditingCurrentWeek,
    hydrateCheckins,
    submitCheckin,
    clearSaveSuccessMessage,
  };
}

export function __resetCoachCheckinsCacheForTests() {
  checkinsPayloadCache.clear();
}
